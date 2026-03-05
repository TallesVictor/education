<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTeachingMaterialRequest;
use App\Http\Requests\UpdateTeachingMaterialRequest;
use App\Http\Resources\TeachingMaterialResource;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TeachingMaterial;
use App\Models\UserSchoolRole;
use App\Support\TenantCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TeachingMaterialController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantSegment = TenantCache::tenantSegment($request);
        $cacheKey = TenantCache::materialsKey($tenantSegment);

        $materials = Cache::remember($cacheKey, TenantCache::MATERIALS_TTL, function () {
            return TeachingMaterial::query()
                ->with(['school', 'schoolClass', 'subjects'])
                ->orderByDesc('published_at')
                ->orderByDesc('created_at')
                ->get();
        });

        if ($this->isStudent($request)) {
            $materials = $materials
                ->filter(fn ($material) => (bool) $material->is_visible_to_students)
                ->values();
        }

        if ($request->string('title')->isNotEmpty()) {
            $needle = strtolower((string) $request->string('title'));
            $materials = $materials
                ->filter(fn ($material) => str_contains(strtolower((string) $material->title), $needle))
                ->values();
        }

        $materials = $this->applyContainsFilters(
            $materials,
            'title',
            $this->normalizeFilterValues($request->input('filter_title')),
        );

        $subjectExternalIds = $this->normalizeFilterValues($request->input('filter_subject_external_id'));
        if (!empty($subjectExternalIds)) {
            $materials = $materials
                ->filter(function ($material) use ($subjectExternalIds) {
                    $materialSubjectIds = $material->subjects
                        ->pluck('external_id')
                        ->map(fn ($externalId) => (string) $externalId)
                        ->all();

                    return !empty(array_intersect($subjectExternalIds, $materialSubjectIds));
                })
                ->values();
        }

        $classExternalIds = $this->normalizeFilterValues($request->input('filter_class_external_id'));
        if (!empty($classExternalIds)) {
            $materials = $materials
                ->filter(fn ($material) => in_array((string) $material->schoolClass?->external_id, $classExternalIds, true))
                ->values();
        }

        $extensionValues = $this->normalizeFilterValues($request->input('filter_file_extension'));
        if (!empty($extensionValues)) {
            $normalizedExtensions = array_map('strtolower', $extensionValues);

            $materials = $materials
                ->filter(fn ($material) => in_array(strtolower((string) $material->file_extension), $normalizedExtensions, true))
                ->values();
        }

        $visibilityFilters = $this->normalizeFilterValues($request->input('filter_is_visible_to_students'));
        if (!empty($visibilityFilters)) {
            $expectVisible = in_array('1', $visibilityFilters, true)
                || in_array('true', array_map('strtolower', $visibilityFilters), true);

            $materials = $materials
                ->filter(fn ($material) => (bool) $material->is_visible_to_students === $expectVisible)
                ->values();
        }

        $perPage = max(1, min(200, (int) $request->input('per_page', 15)));
        $page = max(1, (int) $request->input('page', 1));

        $paginator = new LengthAwarePaginator(
            items: $materials->forPage($page, $perPage)->values(),
            total: $materials->count(),
            perPage: $perPage,
            currentPage: $page,
            options: ['path' => request()->url(), 'query' => request()->query()],
        );

        return response()->json([
            'data' => TeachingMaterialResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(StoreTeachingMaterialRequest $request): JsonResponse
    {
        $schoolId = $this->resolveSchoolId($request);

        $material = DB::transaction(function () use ($request, $schoolId) {
            $uploadedFile = $request->file('file');
            $filePath = $uploadedFile->store('materials', 'public');
            $classId = $this->resolveClassId($request->input('class_external_id'), $schoolId);

            $material = TeachingMaterial::query()->create([
                'school_id' => $schoolId,
                'class_id' => $classId,
                'title' => $request->string('title'),
                'description' => $request->input('description'),
                'file_path' => $filePath,
                'file_original_name' => $uploadedFile->getClientOriginalName(),
                'file_mime_type' => $uploadedFile->getClientMimeType() ?: $uploadedFile->getMimeType() ?: 'application/octet-stream',
                'file_extension' => strtolower((string) ($uploadedFile->getClientOriginalExtension() ?: $uploadedFile->extension() ?: '')),
                'file_size' => $uploadedFile->getSize() ?: 0,
                'published_at' => $request->input('published_at'),
                'version' => $request->input('version'),
                'is_visible_to_students' => $request->boolean('is_visible_to_students', true),
            ]);

            if ($request->has('subject_external_ids')) {
                $subjectIds = $this->resolveSubjectIds($request->input('subject_external_ids', []), $schoolId);
                $material->subjects()->sync($subjectIds);
            }

            return $material;
        });

        TenantCache::flushTeachingMaterialsCache();

        return response()->json([
            'data' => new TeachingMaterialResource($material->load(['school', 'schoolClass', 'subjects'])),
        ], 201);
    }

    public function show(Request $request, string $externalId): JsonResponse
    {
        $material = TeachingMaterial::query()
            ->with(['school', 'schoolClass', 'subjects'])
            ->where('external_id', $externalId)
            ->firstOrFail();

        if ($this->isStudent($request) && !$material->is_visible_to_students) {
            abort(404, 'Material didático não encontrado.');
        }

        return response()->json([
            'data' => new TeachingMaterialResource($material),
        ]);
    }

    public function update(UpdateTeachingMaterialRequest $request, string $externalId): JsonResponse
    {
        $material = TeachingMaterial::query()->where('external_id', $externalId)->firstOrFail();

        DB::transaction(function () use ($request, $material): void {
            $payload = $request->only(['title', 'description', 'version']);

            if ($request->has('published_at')) {
                $payload['published_at'] = $request->input('published_at');
            }

            if ($request->has('is_visible_to_students')) {
                $payload['is_visible_to_students'] = $request->boolean('is_visible_to_students');
            }

            if ($request->has('class_external_id')) {
                $payload['class_id'] = $this->resolveClassId($request->input('class_external_id'), $material->school_id);
            }

            if ($request->hasFile('file')) {
                $uploadedFile = $request->file('file');

                if ($material->file_path) {
                    Storage::disk('public')->delete($material->file_path);
                }

                $payload['file_path'] = $uploadedFile->store('materials', 'public');
                $payload['file_original_name'] = $uploadedFile->getClientOriginalName();
                $payload['file_mime_type'] = $uploadedFile->getClientMimeType() ?: $uploadedFile->getMimeType() ?: 'application/octet-stream';
                $payload['file_extension'] = strtolower((string) ($uploadedFile->getClientOriginalExtension() ?: $uploadedFile->extension() ?: ''));
                $payload['file_size'] = $uploadedFile->getSize() ?: 0;
            }

            $material->update($payload);

            if ($request->has('subject_external_ids')) {
                $subjectIds = $this->resolveSubjectIds($request->input('subject_external_ids', []), $material->school_id);
                $material->subjects()->sync($subjectIds);
            }
        });

        TenantCache::flushTeachingMaterialsCache();

        return response()->json([
            'data' => new TeachingMaterialResource($material->fresh(['school', 'schoolClass', 'subjects'])),
        ]);
    }

    public function destroy(string $externalId): JsonResponse
    {
        $material = TeachingMaterial::query()->where('external_id', $externalId)->firstOrFail();

        DB::transaction(function () use ($material): void {
            $material->subjects()->detach();

            if ($material->file_path) {
                Storage::disk('public')->delete($material->file_path);
            }

            $material->delete();
        });

        TenantCache::flushTeachingMaterialsCache();

        return response()->json([
            'data' => ['message' => 'Material didático removido com sucesso.'],
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

    private function resolveClassId(?string $classExternalId, ?int $schoolId): ?int
    {
        if (!$classExternalId) {
            return null;
        }

        $query = SchoolClass::query()->where('external_id', $classExternalId);

        if (!empty($schoolId)) {
            $query->where('school_id', $schoolId);
        }

        return $query->value('id');
    }

    private function resolveSubjectIds(mixed $subjectExternalIds, ?int $schoolId): array
    {
        if (!is_array($subjectExternalIds) || empty($subjectExternalIds)) {
            return [];
        }

        $query = Subject::query()->whereIn('external_id', $subjectExternalIds);

        if (!empty($schoolId)) {
            $query->where('school_id', $schoolId);
        }

        return $query->pluck('id')->all();
    }

    private function applyContainsFilters(Collection $materials, string $attribute, array $filterValues): Collection
    {
        foreach ($filterValues as $filterValue) {
            $needle = strtolower($filterValue);

            $materials = $materials
                ->filter(function ($material) use ($attribute, $needle) {
                    $value = strtolower((string) ($material->{$attribute} ?? ''));
                    return str_contains($value, $needle);
                })
                ->values();
        }

        return $materials;
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

    private function isStudent(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        $tenantId = app()->bound('tenant')
            ? app('tenant')
            : $user->school_id;

        if (!$tenantId) {
            return false;
        }

        return UserSchoolRole::query()
            ->where('user_id', $user->id)
            ->where('school_id', $tenantId)
            ->whereHas('role', fn ($query) => $query->where('name', 'Aluno'))
            ->exists();
    }
}
