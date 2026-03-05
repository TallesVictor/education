<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkEnrollmentRequest;
use App\Http\Requests\StoreEnrollmentRequest;
use App\Http\Resources\EnrollmentResource;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use App\Services\EnrollmentService;
use App\Support\TenantCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function __construct(private readonly EnrollmentService $enrollmentService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Enrollment::query()->with(['user', 'schoolClass', 'subject']);
        $this->applyTenantScope($query, $request);

        $userNameFilters = $this->normalizeFilterValues($request->input('filter_user_name'));
        foreach ($userNameFilters as $userNameFilter) {
            $query->whereHas('user', function ($userQuery) use ($userNameFilter): void {
                $userQuery->where(function ($userSearchQuery) use ($userNameFilter): void {
                    $userSearchQuery
                        ->where('name', 'like', '%'.$userNameFilter.'%')
                        ->orWhere('social_name', 'like', '%'.$userNameFilter.'%')
                        ->orWhere('email', 'like', '%'.$userNameFilter.'%');
                });
            });
        }

        $classExternalIds = $this->normalizeFilterValues($request->input('filter_class_external_id'));
        if (!empty($classExternalIds)) {
            $query->whereHas('schoolClass', function ($classQuery) use ($classExternalIds): void {
                $classQuery->whereIn('external_id', $classExternalIds);
            });
        }

        $subjectExternalIds = $this->normalizeFilterValues($request->input('filter_subject_external_id'));
        if (!empty($subjectExternalIds)) {
            $query->whereHas('subject', function ($subjectQuery) use ($subjectExternalIds): void {
                $subjectQuery->whereIn('external_id', $subjectExternalIds);
            });
        }

        $enrollments = $query
            ->orderByDesc('id')
            ->paginate((int) $request->input('per_page', 15));

        return response()->json([
            'data' => EnrollmentResource::collection($enrollments->items()),
            'meta' => [
                'current_page' => $enrollments->currentPage(),
                'last_page' => $enrollments->lastPage(),
                'per_page' => $enrollments->perPage(),
                'total' => $enrollments->total(),
            ],
        ]);
    }

    public function store(StoreEnrollmentRequest $request): JsonResponse
    {
        [$user, $class, $subject] = $this->resolveEnrollmentEntities(
            $request->string('user_external_id'),
            $request->string('class_external_id'),
            $request->string('subject_external_id'),
            $request,
        );

        $enrollment = $this->enrollmentService->enroll(
            schoolId: $class->school_id,
            userId: $user->id,
            classId: $class->id,
            subjectId: $subject->id,
            startDate: $request->input('start_date'),
            endDate: $request->input('end_date'),
        );
        TenantCache::flushClassesCache();

        return response()->json([
            'data' => new EnrollmentResource($enrollment->load(['user', 'schoolClass', 'subject'])),
        ], 201);
    }

    public function bulk(BulkEnrollmentRequest $request): JsonResponse
    {
        $class = SchoolClass::query()->where('external_id', $request->string('class_external_id'))->firstOrFail();
        $subject = Subject::query()->where('external_id', $request->string('subject_external_id'))->firstOrFail();

        $isSubjectAttachedToClass = $class->subjects()->where('subjects.id', $subject->id)->exists();
        abort_if(!$isSubjectAttachedToClass, 422, 'A disciplina precisa estar vinculada à turma informada.');

        if (!$request->user()->isAdmin()) {
            $tenantId = app()->bound('tenant')
                ? app('tenant')
                : $request->user()->school_id;

            abort_if($class->school_id !== $tenantId, 403, 'Turma não pertence ao tenant ativo.');
            abort_if(!$subject->schools()->where('schools.id', $tenantId)->exists(), 403, 'Disciplina não pertence ao tenant ativo.');
        }

        $students = User::query()
            ->whereIn('external_id', $request->input('student_external_ids'))
            ->pluck('id')
            ->all();

        $count = $this->enrollmentService->bulkEnroll(
            schoolId: $class->school_id,
            studentIds: $students,
            classId: $class->id,
            subjectId: $subject->id,
            startDate: $request->input('start_date'),
            endDate: $request->input('end_date'),
        );
        TenantCache::flushClassesCache();

        return response()->json([
            'data' => [
                'processed' => $count,
            ],
        ]);
    }

    public function destroy(string $externalId): JsonResponse
    {
        $enrollment = Enrollment::query()->where('external_id', $externalId)->firstOrFail();
        $enrollment->delete();
        TenantCache::flushClassesCache();

        return response()->json([
            'data' => ['message' => 'Matrícula removida com sucesso.'],
        ]);
    }

    public function byStudent(Request $request, string $userExternalId): JsonResponse
    {
        $query = Enrollment::query()
            ->with(['user', 'schoolClass', 'subject'])
            ->whereHas('user', fn ($userQuery) => $userQuery->where('external_id', $userExternalId));

        $this->applyTenantScope($query, $request);

        $enrollments = $query->get();

        return response()->json([
            'data' => EnrollmentResource::collection($enrollments),
        ]);
    }

    private function resolveEnrollmentEntities(
        string $userExternalId,
        string $classExternalId,
        string $subjectExternalId,
        Request $request,
    ): array {
        $user = User::query()->where('external_id', $userExternalId)->firstOrFail();
        $class = SchoolClass::query()->where('external_id', $classExternalId)->firstOrFail();
        $subject = Subject::query()->where('external_id', $subjectExternalId)->firstOrFail();

        $isSubjectAttachedToClass = $class->subjects()->where('subjects.id', $subject->id)->exists();
        abort_if(!$isSubjectAttachedToClass, 422, 'A disciplina precisa estar vinculada à turma informada.');

        if (!$request->user()->isAdmin()) {
            $tenantId = app()->bound('tenant')
                ? app('tenant')
                : $request->user()->school_id;

            abort_if($user->school_id !== $tenantId, 403, 'Usuário não pertence ao tenant ativo.');
            abort_if($class->school_id !== $tenantId, 403, 'Turma não pertence ao tenant ativo.');
            abort_if(!$subject->schools()->where('schools.id', $tenantId)->exists(), 403, 'Disciplina não pertence ao tenant ativo.');
        }

        return [$user, $class, $subject];
    }

    private function applyTenantScope(Builder $query, Request $request): void
    {
        $tenantId = app()->bound('tenant') ? app('tenant') : null;

        if (!$tenantId || $request->user()->isAdmin()) {
            return;
        }

        $query
            ->whereHas('user', fn ($q) => $q->where('school_id', $tenantId))
            ->whereHas('schoolClass', fn ($q) => $q->where('school_id', $tenantId))
            ->whereHas('subject.schools', fn ($q) => $q->where('schools.id', $tenantId));
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
