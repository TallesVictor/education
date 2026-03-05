<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSubjectRequest;
use App\Http\Requests\UpdateSubjectRequest;
use App\Http\Resources\SubjectResource;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Support\TenantCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantSegment = TenantCache::tenantSegment($request);
        $cacheKey = TenantCache::subjectsKey($tenantSegment);
        $tenantId = $this->resolveTenantId($request);

        $subjects = Cache::remember($cacheKey, TenantCache::SUBJECTS_TTL, function () use ($tenantId) {
            $query = Subject::query()
                ->with(['school', 'schools', 'classes'])
                ->withCount('classes')
                ->orderBy('name');

            if (!empty($tenantId)) {
                $query->whereHas('schools', fn (Builder $schoolQuery) => $schoolQuery->where('schools.id', $tenantId));
            }

            return $query->get();
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
                ->filter(function ($subject) use ($schoolExternalIds) {
                    $subjectSchoolExternalIds = $subject->schools
                        ->pluck('external_id')
                        ->map(fn ($externalId) => (string) $externalId)
                        ->all();

                    return !empty(array_intersect($schoolExternalIds, $subjectSchoolExternalIds));
                })
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
        $shouldSyncClasses = $request->boolean('sync_classes') || $request->has('class_external_ids');
        $requestedSchoolIds = $this->resolveSchoolIds($request);

        $classResolution = $shouldSyncClasses
            ? $this->resolveClassIds(
                classExternalIds: $request->input('class_external_ids', []),
                allowedSchoolIds: !empty($requestedSchoolIds) ? $requestedSchoolIds : null,
            )
            : ['class_ids' => [], 'school_ids' => []];

        $schoolIds = !empty($requestedSchoolIds) ? $requestedSchoolIds : $classResolution['school_ids'];
        $schoolIds = array_values(array_unique(array_map('intval', $schoolIds)));

        if (empty($schoolIds)) {
            throw ValidationException::withMessages([
                'school_external_ids' => ['Selecione ao menos uma escola para a disciplina.'],
            ]);
        }

        $subject = DB::transaction(function () use ($request, $schoolIds, $classResolution, $shouldSyncClasses) {
            $payload = [
                'school_id' => $schoolIds[0],
                'name' => $request->string('name'),
                'description' => $request->input('description'),
            ];

            if ($request->hasFile('image')) {
                $payload['image_path'] = $request->file('image')->store('subjects', 'public');
            }

            $subject = Subject::query()->create($payload);
            $subject->schools()->sync($schoolIds);

            if ($shouldSyncClasses) {
                $subject->classes()->sync($classResolution['class_ids']);
            }

            return $subject;
        });

        TenantCache::flushSubjectsCache();
        TenantCache::flushClassesCache();

        return response()->json([
            'data' => new SubjectResource($subject->load(['school', 'schools', 'classes'])->loadCount('classes')),
        ], 201);
    }

    public function show(Request $request, string $externalId): JsonResponse
    {
        $subject = $this->subjectQuery($request)
            ->with(['school', 'schools', 'classes'])
            ->withCount('classes')
            ->where('external_id', $externalId)
            ->firstOrFail();

        return response()->json([
            'data' => new SubjectResource($subject),
        ]);
    }

    public function update(UpdateSubjectRequest $request, string $externalId): JsonResponse
    {
        $subject = $this->subjectQuery($request)
            ->with('schools')
            ->where('external_id', $externalId)
            ->firstOrFail();

        $shouldSyncSchools = $request->boolean('sync_schools')
            || $request->has('school_external_ids')
            || $request->has('school_external_id');
        $shouldSyncClasses = $request->boolean('sync_classes') || $request->has('class_external_ids');

        $currentSchoolIds = $subject->schools
            ->pluck('id')
            ->map(fn ($schoolId) => (int) $schoolId)
            ->values()
            ->all();

        if (empty($currentSchoolIds) && !empty($subject->school_id)) {
            $currentSchoolIds = [(int) $subject->school_id];
        }

        $requestedSchoolIds = $shouldSyncSchools ? $this->resolveSchoolIds($request) : $currentSchoolIds;
        $classResolution = $shouldSyncClasses
            ? $this->resolveClassIds(
                classExternalIds: $request->input('class_external_ids', []),
                allowedSchoolIds: ($shouldSyncSchools && !empty($requestedSchoolIds)) ? $requestedSchoolIds : null,
            )
            : ['class_ids' => [], 'school_ids' => []];

        $schoolIds = $requestedSchoolIds;

        if (empty($schoolIds)) {
            $schoolIds = $classResolution['school_ids'];
        }

        if (!$shouldSyncSchools) {
            $schoolIds = array_values(array_unique([...$currentSchoolIds, ...$classResolution['school_ids']]));
        }

        $schoolIds = array_values(array_unique(array_map('intval', $schoolIds)));

        if (empty($schoolIds)) {
            throw ValidationException::withMessages([
                'school_external_ids' => ['A disciplina precisa permanecer vinculada a pelo menos uma escola.'],
            ]);
        }

        if ($shouldSyncSchools && !$shouldSyncClasses) {
            $hasClassesOutsideSelectedSchools = $subject->classes()
                ->whereNotIn('classes.school_id', $schoolIds)
                ->exists();

            if ($hasClassesOutsideSelectedSchools) {
                throw ValidationException::withMessages([
                    'school_external_ids' => ['Existem turmas vinculadas fora das escolas selecionadas. Ajuste as turmas ou inclua as escolas correspondentes.'],
                ]);
            }
        }

        DB::transaction(function () use ($request, $subject, $schoolIds, $shouldSyncSchools, $shouldSyncClasses, $classResolution): void {
            $payload = $request->only(['name', 'description']);
            $payload['school_id'] = $schoolIds[0];

            if ($request->hasFile('image')) {
                $payload['image_path'] = $request->file('image')->store('subjects', 'public');
            }

            $subject->update($payload);
            if ($shouldSyncSchools) {
                $subject->schools()->sync($schoolIds);
            } else {
                $subject->schools()->syncWithoutDetaching($schoolIds);
            }

            if ($shouldSyncClasses) {
                $subject->classes()->sync($classResolution['class_ids']);
            }
        });

        TenantCache::flushSubjectsCache();
        TenantCache::flushClassesCache();

        return response()->json([
            'data' => new SubjectResource($subject->fresh(['school', 'schools', 'classes'])->loadCount('classes')),
        ]);
    }

    public function destroy(Request $request, string $externalId): JsonResponse
    {
        $subject = $this->subjectQuery($request)->where('external_id', $externalId)->firstOrFail();
        $subject->delete();

        TenantCache::flushSubjectsCache();
        TenantCache::flushClassesCache();

        return response()->json([
            'data' => ['message' => 'Disciplina removida com sucesso.'],
        ]);
    }

    private function resolveTenantId(Request $request): ?int
    {
        if (app()->bound('tenant')) {
            return (int) app('tenant');
        }

        if ($request->user() && !$request->user()->isAdmin() && !empty($request->user()->school_id)) {
            return (int) $request->user()->school_id;
        }

        return null;
    }

    private function subjectQuery(Request $request): Builder
    {
        $query = Subject::query();
        $tenantId = $this->resolveTenantId($request);

        if (!empty($tenantId)) {
            $query->whereHas('schools', fn (Builder $schoolQuery) => $schoolQuery->where('schools.id', $tenantId));
        }

        return $query;
    }

    private function resolveSchoolIds(Request $request): array
    {
        if (!$request->user()->isAdmin()) {
            $tenantId = $this->resolveTenantId($request);
            return !empty($tenantId) ? [$tenantId] : [];
        }

        if (app()->bound('tenant')) {
            return [(int) app('tenant')];
        }

        $externalIds = $this->normalizeFilterValues($request->input('school_external_ids'));

        if (empty($externalIds) && $request->filled('school_external_id')) {
            $externalIds = [(string) $request->string('school_external_id')];
        }

        if (empty($externalIds)) {
            return [];
        }

        $schools = School::query()
            ->whereIn('external_id', $externalIds)
            ->get(['id', 'external_id']);

        $matchedExternalIds = $schools
            ->pluck('external_id')
            ->map(fn ($externalId) => (string) $externalId)
            ->all();

        $missingExternalIds = array_values(array_diff($externalIds, $matchedExternalIds));

        if (!empty($missingExternalIds)) {
            throw ValidationException::withMessages([
                'school_external_ids' => ['Uma ou mais escolas selecionadas são inválidas.'],
            ]);
        }

        return $schools
            ->pluck('id')
            ->map(fn ($schoolId) => (int) $schoolId)
            ->values()
            ->all();
    }

    private function resolveClassIds(mixed $classExternalIds, ?array $allowedSchoolIds = null): array
    {
        if (!is_array($classExternalIds) || empty($classExternalIds)) {
            return [
                'class_ids' => [],
                'school_ids' => [],
            ];
        }

        $requestedExternalIds = collect($classExternalIds)
            ->filter(fn ($externalId) => is_string($externalId) || is_numeric($externalId))
            ->map(fn ($externalId) => trim((string) $externalId))
            ->filter(fn (string $externalId) => $externalId !== '')
            ->unique()
            ->values();

        if ($requestedExternalIds->isEmpty()) {
            return [
                'class_ids' => [],
                'school_ids' => [],
            ];
        }

        $query = SchoolClass::query()->whereIn('external_id', $requestedExternalIds->all());

        if (!empty($allowedSchoolIds)) {
            $query->whereIn('school_id', $allowedSchoolIds);
        }

        $matchedClasses = $query->get(['id', 'external_id', 'school_id']);
        $matchedExternalIds = $matchedClasses
            ->pluck('external_id')
            ->map(fn ($externalId) => (string) $externalId)
            ->all();

        $missingExternalIds = array_values(array_diff($requestedExternalIds->all(), $matchedExternalIds));

        if (!empty($missingExternalIds)) {
            throw ValidationException::withMessages([
                'class_external_ids' => ['Uma ou mais turmas selecionadas são inválidas para as escolas informadas.'],
            ]);
        }

        return [
            'class_ids' => $matchedClasses->pluck('id')->all(),
            'school_ids' => $matchedClasses
                ->pluck('school_id')
                ->map(fn ($schoolId) => (int) $schoolId)
                ->unique()
                ->values()
                ->all(),
        ];
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
