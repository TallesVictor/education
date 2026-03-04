<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSubjectRequest;
use App\Http\Requests\UpdateSubjectRequest;
use App\Http\Resources\SubjectResource;
use App\Models\School;
use App\Models\Subject;
use App\Support\TenantCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

class SubjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantSegment = TenantCache::tenantSegment($request);
        $cacheKey = TenantCache::subjectsKey($tenantSegment);

        $subjects = Cache::remember($cacheKey, TenantCache::SUBJECTS_TTL, function () {
            return Subject::query()
                ->with('school')
                ->orderBy('name')
                ->get();
        });

        if ($request->string('name')->isNotEmpty()) {
            $needle = strtolower((string) $request->string('name'));
            $subjects = $subjects->filter(fn ($subject) => str_contains(strtolower($subject->name), $needle))->values();
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

        $payload = [
            'school_id' => $schoolId,
            'name' => $request->string('name'),
            'description' => $request->input('description'),
        ];

        if ($request->hasFile('image')) {
            $payload['image_path'] = $request->file('image')->store('subjects', 'public');
        }

        $subject = Subject::query()->create($payload);

        TenantCache::flushSubjectsCache();

        return response()->json([
            'data' => new SubjectResource($subject->load('school')),
        ], 201);
    }

    public function show(string $externalId): JsonResponse
    {
        $subject = Subject::query()->with('school')->where('external_id', $externalId)->firstOrFail();

        return response()->json([
            'data' => new SubjectResource($subject),
        ]);
    }

    public function update(UpdateSubjectRequest $request, string $externalId): JsonResponse
    {
        $subject = Subject::query()->where('external_id', $externalId)->firstOrFail();

        $payload = $request->only(['name', 'description']);

        if ($request->hasFile('image')) {
            $payload['image_path'] = $request->file('image')->store('subjects', 'public');
        }

        $subject->update($payload);

        TenantCache::flushSubjectsCache();

        return response()->json([
            'data' => new SubjectResource($subject->fresh('school')),
        ]);
    }

    public function destroy(string $externalId): JsonResponse
    {
        $subject = Subject::query()->where('external_id', $externalId)->firstOrFail();
        $subject->delete();

        TenantCache::flushSubjectsCache();

        return response()->json([
            'data' => ['message' => 'Disciplina removida com sucesso.'],
        ]);
    }

    private function resolveSchoolId(Request $request): ?int
    {
        if (!$request->user()->isAdmin()) {
            return app('tenant.school_id');
        }

        if (!app()->bound('tenant.school_id') && !$request->filled('school_external_id')) {
            return null;
        }

        if (app()->bound('tenant.school_id')) {
            return app('tenant.school_id');
        }

        return School::query()->where('external_id', $request->string('school_external_id'))->value('id');
    }
}
