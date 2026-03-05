<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSubjectRequest;
use App\Http\Requests\UpdateSubjectRequest;
use App\Http\Resources\SubjectResource;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Support\TenantCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SubjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantSegment = TenantCache::tenantSegment($request);
        $cacheKey = TenantCache::subjectsKey($tenantSegment);

        $subjects = Cache::remember($cacheKey, TenantCache::SUBJECTS_TTL, function () {
            return Subject::query()
                ->with(['school', 'classes'])
                ->withCount('classes')
                ->orderBy('name')
                ->get();
        });

        if ($request->string('name')->isNotEmpty()) {
            $needle = strtolower((string) $request->string('name'));
            $subjects = $subjects->filter(fn ($subject) => str_contains(strtolower($subject->name), $needle))->values();
        }

        $subjects = $this->applyContainsFilters($subjects, 'name', $this->normalizeFilterValues($request->input('filter_name')));
        $subjects = $this->applyContainsFilters($subjects, 'description', $this->normalizeFilterValues($request->input('filter_description')));

        $schoolExternalIds = $this->normalizeFilterValues($request->input('filter_school_external_id'));
        if (!empty($schoolExternalIds)) {
            $subjects = $subjects
                ->filter(fn ($subject) => in_array((string) $subject->school?->external_id, $schoolExternalIds, true))
                ->values();
        }

        $classExternalIds = $this->normalizeFilterValues($request->input('filter_class_external_id'));
        if (!empty($classExternalIds)) {
            $subjects = $subjects
                ->filter(function ($subject) use ($classExternalIds) {
                    $subjectClassExternalIds = $subject->classes
                        ->pluck('external_id')
                        ->map(fn ($externalId) => (string) $externalId)
                        ->all();

                    return !empty(array_intersect($classExternalIds, $subjectClassExternalIds));
                })
                ->values();
        }

        $perPage = max(1, min(200, (int) $request->input('per_page', 15)));
        $page = max(1, (int) $request->input('page', 1));

        $paginator = new LengthAwarePaginator(
            items: $subjects->forPage($page, $perPage)->values(),
            total: $subjects->count(),
            perPage: $perPage,
            currentPage: $page,
            options: ['path' => request()->url(), 'query' => request()->query()],
        );

        return response()->json([
            'data' => SubjectResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(StoreSubjectRequest $request): JsonResponse
    {
        $schoolId = $this->resolveSchoolId($request);

        $subject = DB::transaction(function () use ($request, $schoolId) {
            $payload = [
                'school_id' => $schoolId,
                'name' => $request->string('name'),
                'description' => $request->input('description'),
            ];

            if ($request->hasFile('image')) {
                $payload['image_path'] = $request->file('image')->store('subjects', 'public');
            }

            $subject = Subject::query()->create($payload);

            if ($request->boolean('sync_classes') || $request->has('class_external_ids')) {
                $classIds = $this->resolveClassIds(
                    classExternalIds: $request->input('class_external_ids', []),
                    schoolId: $schoolId,
                );

                $subject->classes()->sync($classIds);
            }

            return $subject;
        });

        TenantCache::flushSubjectsCache();
        TenantCache::flushClassesCache();

        return response()->json([
            'data' => new SubjectResource($subject->load(['school', 'classes'])->loadCount('classes')),
        ], 201);
    }

    public function show(string $externalId): JsonResponse
    {
        $subject = Subject::query()
            ->with(['school', 'classes'])
            ->withCount('classes')
            ->where('external_id', $externalId)
            ->firstOrFail();

        return response()->json([
            'data' => new SubjectResource($subject),
        ]);
    }

    public function update(UpdateSubjectRequest $request, string $externalId): JsonResponse
    {
        $subject = Subject::query()->where('external_id', $externalId)->firstOrFail();

        DB::transaction(function () use ($request, $subject): void {
            $payload = $request->only(['name', 'description']);

            if ($request->hasFile('image')) {
                $payload['image_path'] = $request->file('image')->store('subjects', 'public');
            }

            $subject->update($payload);

            if ($request->boolean('sync_classes') || $request->has('class_external_ids')) {
                $classIds = $this->resolveClassIds(
                    classExternalIds: $request->input('class_external_ids', []),
                    schoolId: $subject->school_id,
                );

                $subject->classes()->sync($classIds);
            }
        });

        TenantCache::flushSubjectsCache();
        TenantCache::flushClassesCache();

        return response()->json([
            'data' => new SubjectResource($subject->fresh(['school', 'classes'])->loadCount('classes')),
        ]);
    }

    public function destroy(string $externalId): JsonResponse
    {
        $subject = Subject::query()->where('external_id', $externalId)->firstOrFail();
        $subject->delete();

        TenantCache::flushSubjectsCache();
        TenantCache::flushClassesCache();

        return response()->json([
            'data' => ['message' => 'Disciplina removida com sucesso.'],
        ]);
    }

    private function resolveSchoolId(Request $request): ?int
    {
        if (!$request->user()->isAdmin()) {
            return app()->bound('tenant') ? app('tenant') : null;
        }

        if (!app()->bound('tenant') && !$request->filled('school_external_id')) {
            return null;
        }

        if (app()->bound('tenant')) {
            return app('tenant');
        }

        return School::query()->where('external_id', $request->string('school_external_id'))->value('id');
    }

    private function resolveClassIds(mixed $classExternalIds, ?int $schoolId): array
    {
        if (!is_array($classExternalIds) || empty($classExternalIds)) {
            return [];
        }

        $query = SchoolClass::query()->whereIn('external_id', $classExternalIds);

        if (!empty($schoolId)) {
            $query->where('school_id', $schoolId);
        }

        return $query->pluck('id')->all();
    }

    private function applyContainsFilters(Collection $subjects, string $attribute, array $filterValues): Collection
    {
        foreach ($filterValues as $filterValue) {
            $needle = strtolower($filterValue);

            $subjects = $subjects
                ->filter(function ($subject) use ($attribute, $needle) {
                    $value = strtolower((string) ($subject->{$attribute} ?? ''));
                    return str_contains($value, $needle);
                })
                ->values();
        }

        return $subjects;
    }

    private function normalizeFilterValues(mixed $rawValues): array
    {
        $values = is_array($rawValues) ? $rawValues : [$rawValues];

        return collect($values)
            ->filter(fn ($value) => is_string($value) || is_numeric($value))
            ->map(fn ($value) => trim((string) $value))
            ->filter(fn (string $value) => $value !== '')
            ->values()
            ->all();
    }
}
