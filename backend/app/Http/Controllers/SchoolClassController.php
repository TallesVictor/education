<?php

namespace App\Http\Controllers;

use App\Http\Requests\AttachClassSubjectsRequest;
use App\Http\Requests\StoreClassRequest;
use App\Http\Requests\UpdateClassRequest;
use App\Http\Resources\SchoolClassResource;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Support\TenantCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SchoolClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantSegment = TenantCache::tenantSegment($request);
        $cacheKey = TenantCache::classesKey($tenantSegment);

        $classes = Cache::remember($cacheKey, TenantCache::CLASSES_TTL, function () {
            return SchoolClass::query()
                ->with(['school', 'subjects'])
                ->withCount(['subjects'])
                ->withCount([
                    'enrollments as enrollments_count' => function ($query) {
                        $query->select(DB::raw('count(distinct user_id)'));
                    },
                ])
                ->orderByDesc('year')
                ->orderBy('name')
                ->get();
        });

        if ($request->string('name')->isNotEmpty()) {
            $needle = strtolower((string) $request->string('name'));
            $classes = $classes->filter(fn ($class) => str_contains(strtolower($class->name), $needle))->values();
        }

        if ($request->filled('year')) {
            $year = (int) $request->integer('year');
            $classes = $classes->filter(fn ($class) => (int) $class->year === $year)->values();
        }

        $perPage = max(1, min(200, (int) $request->input('per_page', 15)));
        $page = max(1, (int) $request->input('page', 1));

        $paginator = new LengthAwarePaginator(
            items: $classes->forPage($page, $perPage)->values(),
            total: $classes->count(),
            perPage: $perPage,
            currentPage: $page,
            options: ['path' => request()->url(), 'query' => request()->query()],
        );

        return response()->json([
            'data' => SchoolClassResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(StoreClassRequest $request): JsonResponse
    {
        $schoolId = $this->resolveSchoolId($request);

        $class = DB::transaction(function () use ($request, $schoolId) {
            $class = SchoolClass::query()->create([
                'school_id' => $schoolId,
                'name' => $request->string('name'),
                'year' => $request->integer('year'),
            ]);

            if ($request->has('subject_external_ids')) {
                $subjectIds = Subject::query()
                    ->whereIn('external_id', $request->input('subject_external_ids'))
                    ->pluck('id')
                    ->all();

                $class->subjects()->sync($subjectIds);
            }

            return $class;
        });

        TenantCache::flushClassesCache();
        TenantCache::flushSubjectsCache();

        return response()->json([
            'data' => new SchoolClassResource($class->load(['school', 'subjects'])),
        ], 201);
    }

    public function show(string $externalId): JsonResponse
    {
        $class = SchoolClass::query()
            ->with(['school', 'subjects', 'enrollments.user'])
            ->withCount(['subjects'])
            ->withCount([
                'enrollments as enrollments_count' => function ($query) {
                    $query->select(DB::raw('count(distinct user_id)'));
                },
            ])
            ->where('external_id', $externalId)
            ->firstOrFail();

        return response()->json([
            'data' => new SchoolClassResource($class),
        ]);
    }

    public function update(UpdateClassRequest $request, string $externalId): JsonResponse
    {
        $class = SchoolClass::query()->where('external_id', $externalId)->firstOrFail();

        DB::transaction(function () use ($request, $class): void {
            $class->update($request->only(['name', 'year']));

            if ($request->has('subject_external_ids')) {
                $subjectIds = Subject::query()
                    ->whereIn('external_id', $request->input('subject_external_ids'))
                    ->pluck('id')
                    ->all();

                $class->subjects()->sync($subjectIds);
            }
        });

        TenantCache::flushClassesCache();
        TenantCache::flushSubjectsCache();

        return response()->json([
            'data' => new SchoolClassResource($class->fresh(['school', 'subjects'])),
        ]);
    }

    public function destroy(string $externalId): JsonResponse
    {
        $class = SchoolClass::query()->where('external_id', $externalId)->firstOrFail();
        $class->delete();

        TenantCache::flushClassesCache();
        TenantCache::flushSubjectsCache();

        return response()->json([
            'data' => ['message' => 'Turma removida com sucesso.'],
        ]);
    }

    public function attachSubjects(AttachClassSubjectsRequest $request, string $externalId): JsonResponse
    {
        $class = SchoolClass::query()->where('external_id', $externalId)->firstOrFail();

        $subjectIds = Subject::query()
            ->whereIn('external_id', $request->input('subject_external_ids'))
            ->pluck('id')
            ->all();

        $class->subjects()->syncWithoutDetaching($subjectIds);
        TenantCache::flushClassesCache();
        TenantCache::flushSubjectsCache();

        return response()->json([
            'data' => new SchoolClassResource($class->fresh(['school', 'subjects'])),
        ]);
    }

    public function detachSubject(string $externalId, string $subjectExternalId): JsonResponse
    {
        $class = SchoolClass::query()->where('external_id', $externalId)->firstOrFail();

        $subjectId = Subject::query()->where('external_id', $subjectExternalId)->value('id');

        if ($subjectId) {
            $class->subjects()->detach($subjectId);
        }

        TenantCache::flushClassesCache();
        TenantCache::flushSubjectsCache();

        return response()->json([
            'data' => ['message' => 'Disciplina desvinculada com sucesso.'],
        ]);
    }

    private function resolveSchoolId(Request $request): ?int
    {
        if (!$request->user()->isAdmin()) {
            return app()->bound('tenant') ? app('tenant') : null;
        }

        if (app()->bound('tenant')) {
            return app('tenant');
        }

        if (!$request->filled('school_external_id')) {
            return null;
        }

        return School::query()->where('external_id', $request->string('school_external_id'))->value('id');
    }
}
