<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreForumTopicRequest;
use App\Http\Requests\UpdateForumTopicRequest;
use App\Http\Resources\ForumTopicResource;
use App\Models\ForumTopic;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Support\ForumVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ForumTopicController extends Controller
{
    public function __construct(private readonly ForumVisibility $forumVisibility) {}

    public function context(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(!$user, 401, 'Não autenticado.');

        $tenantId = app()->bound('tenant') ? (int) app('tenant') : null;

        if ($user->isAdmin() && !$tenantId) {
            $schools = School::query()
                ->orderBy('name')
                ->get(['id', 'external_id', 'name']);

            $classes = SchoolClass::query()
                ->with('school')
                ->orderByDesc('year')
                ->orderBy('name')
                ->get(['id', 'external_id', 'school_id', 'name', 'year']);
        } else {
            $effectiveSchoolId = $tenantId ?: (int) $user->school_id;
            abort_if(!$effectiveSchoolId, 403, 'Contexto da escola não encontrado.');

            $schools = School::query()
                ->where('id', $effectiveSchoolId)
                ->orderBy('name')
                ->get(['id', 'external_id', 'name']);

            $classesQuery = SchoolClass::query()
                ->with('school')
                ->where('school_id', $effectiveSchoolId)
                ->orderByDesc('year')
                ->orderBy('name');

            if ($this->forumVisibility->isStudent($request, $effectiveSchoolId)) {
                $studentClassIds = Enrollment::query()
                    ->where('user_id', $user->id)
                    ->where('school_id', $effectiveSchoolId)
                    ->pluck('class_id')
                    ->filter(fn ($classId) => !empty($classId))
                    ->values()
                    ->all();

                if (empty($studentClassIds)) {
                    $classesQuery->whereRaw('1 = 0');
                } else {
                    $classesQuery->whereIn('id', $studentClassIds);
                }
            }

            $classes = $classesQuery->get(['id', 'external_id', 'school_id', 'name', 'year']);
        }

        return response()->json([
            'data' => [
                'schools' => $schools->map(fn ($school) => [
                    'external_id' => $school->external_id,
                    'name' => $school->name,
                ])->values(),
                'classes' => $classes->map(fn ($schoolClass) => [
                    'external_id' => $schoolClass->external_id,
                    'school_external_id' => $schoolClass->school?->external_id,
                    'name' => $schoolClass->name,
                    'year' => $schoolClass->year,
                ])->values(),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = ForumTopic::query()
            ->with(['school', 'schoolClass', 'creator'])
            ->withCount('discussions');

        $this->forumVisibility->applyTopicVisibilityScope($query, $request);

        $title = trim((string) ($request->input('title') ?? $request->input('search') ?? ''));
        if ($title !== '') {
            $query->where('title', 'like', '%'.$title.'%');
        }

        $scopes = $this->normalizeFilterValues($request->input('scope', $request->input('filter_scope')));
        if (!empty($scopes)) {
            $query->whereIn('scope', $scopes);
        }

        $schoolExternalIds = $this->normalizeFilterValues($request->input('school_external_id', $request->input('filter_school_external_id')));
        if (!empty($schoolExternalIds)) {
            $query->whereHas('school', fn ($schoolQuery) => $schoolQuery->whereIn('external_id', $schoolExternalIds));
        }

        $classExternalIds = $this->normalizeFilterValues($request->input('class_external_id', $request->input('filter_class_external_id')));
        if (!empty($classExternalIds)) {
            $query->whereHas('schoolClass', fn ($classQuery) => $classQuery->whereIn('external_id', $classExternalIds));
        }

        $authorExternalIds = $this->normalizeFilterValues($request->input('author_external_id', $request->input('filter_author_external_id')));
        if (!empty($authorExternalIds)) {
            $query->whereHas('creator', fn ($creatorQuery) => $creatorQuery->whereIn('external_id', $authorExternalIds));
        }

        $authorSearch = trim((string) $request->input('author', ''));
        if ($authorSearch !== '') {
            $query->whereHas('creator', function ($creatorQuery) use ($authorSearch): void {
                $creatorQuery->where(function ($authorQuery) use ($authorSearch): void {
                    $authorQuery
                        ->where('name', 'like', '%'.$authorSearch.'%')
                        ->orWhere('social_name', 'like', '%'.$authorSearch.'%')
                        ->orWhere('email', 'like', '%'.$authorSearch.'%');
                });
            });
        }

        $tags = $this->normalizeFilterValues($request->input('tag', $request->input('filter_tag')));
        foreach ($tags as $tag) {
            $query->whereJsonContains('tags', $tag);
        }

        $statuses = $this->normalizeFilterValues($request->input('status', $request->input('filter_status')));
        if (!empty($statuses)) {
            $query->where(function ($statusQuery) use ($statuses): void {
                if (in_array('open', $statuses, true)) {
                    $statusQuery->orWhere(function ($openQuery): void {
                        $openQuery
                            ->whereNull('expires_at')
                            ->orWhere('expires_at', '>=', now());
                    });
                }

                if (in_array('expired', $statuses, true)) {
                    $statusQuery->orWhere('expires_at', '<', now());
                }
            });
        }

        $isPinnedFilters = $this->normalizeFilterValues($request->input('is_pinned', $request->input('filter_is_pinned')));
        if (!empty($isPinnedFilters)) {
            $expectsPinned = in_array('1', $isPinnedFilters, true)
                || in_array('true', array_map('strtolower', $isPinnedFilters), true);
            $query->where('is_pinned', $expectsPinned);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', (string) $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', (string) $request->input('date_to'));
        }

        $topics = $query
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->paginate((int) $request->input('per_page', 15));

        return response()->json([
            'data' => ForumTopicResource::collection($topics->items()),
            'meta' => [
                'current_page' => $topics->currentPage(),
                'last_page' => $topics->lastPage(),
                'per_page' => $topics->perPage(),
                'total' => $topics->total(),
            ],
        ]);
    }

    public function store(StoreForumTopicRequest $request): JsonResponse
    {
        [$scope, $schoolId, $classId] = $this->resolveScopeIdentifiers(
            request: $request,
            scope: (string) $request->string('scope'),
            schoolExternalId: $request->input('school_external_id'),
            classExternalId: $request->input('class_external_id'),
        );

        $topic = DB::transaction(function () use ($request, $scope, $schoolId, $classId) {
            $payload = [
                'scope' => $scope,
                'school_id' => $schoolId,
                'class_id' => $classId,
                'created_by_user_id' => (int) $request->user()->id,
                'title' => (string) $request->string('title'),
                'description' => $request->input('description'),
                'tags' => $this->sanitizeTags($request->input('tags')),
                'expires_at' => $request->input('expires_at'),
                'is_pinned' => $request->boolean('is_pinned', false),
            ];

            if ($request->hasFile('attachment')) {
                $attachment = $request->file('attachment');
                $payload['attachment_path'] = $attachment->store('forum_attachments', 'public');
                $payload['attachment_original_name'] = $attachment->getClientOriginalName();
                $payload['attachment_mime_type'] = $attachment->getClientMimeType() ?: $attachment->getMimeType() ?: 'application/octet-stream';
                $payload['attachment_extension'] = strtolower((string) ($attachment->getClientOriginalExtension() ?: $attachment->extension() ?: ''));
                $payload['attachment_size'] = $attachment->getSize() ?: 0;
            }

            return ForumTopic::query()->create($payload);
        });

        return response()->json([
            'data' => new ForumTopicResource($topic->load(['school', 'schoolClass', 'creator'])->loadCount('discussions')),
        ], 201);
    }

    public function show(Request $request, string $externalId): JsonResponse
    {
        $topic = ForumTopic::query()
            ->with(['school', 'schoolClass', 'creator'])
            ->withCount('discussions')
            ->where('external_id', $externalId)
            ->firstOrFail();

        $this->forumVisibility->assertUserCanViewTopic($topic, $request);

        return response()->json([
            'data' => new ForumTopicResource($topic),
        ]);
    }

    public function update(UpdateForumTopicRequest $request, string $externalId): JsonResponse
    {
        $topic = ForumTopic::query()
            ->with(['school', 'schoolClass'])
            ->where('external_id', $externalId)
            ->firstOrFail();

        $effectiveScope = (string) ($request->input('scope') ?: $topic->scope);
        $effectiveSchoolExternalId = $request->has('school_external_id')
            ? $request->input('school_external_id')
            : $topic->school?->external_id;
        $effectiveClassExternalId = $request->has('class_external_id')
            ? $request->input('class_external_id')
            : $topic->schoolClass?->external_id;

        [$scope, $schoolId, $classId] = $this->resolveScopeIdentifiers(
            request: $request,
            scope: $effectiveScope,
            schoolExternalId: $effectiveSchoolExternalId,
            classExternalId: $effectiveClassExternalId,
        );

        $payload = [
            'scope' => $scope,
            'school_id' => $schoolId,
            'class_id' => $classId,
        ];

        if ($request->has('title')) {
            $payload['title'] = (string) $request->string('title');
        }

        if ($request->has('description')) {
            $payload['description'] = $request->input('description');
        }

        if ($request->has('tags')) {
            $payload['tags'] = $this->sanitizeTags($request->input('tags'));
        }

        if ($request->has('expires_at')) {
            $payload['expires_at'] = $request->input('expires_at');
        }

        if ($request->has('is_pinned')) {
            $payload['is_pinned'] = $request->boolean('is_pinned');
        }

        DB::transaction(function () use ($request, $topic, $payload): void {
            if ($request->boolean('remove_attachment') && $topic->attachment_path) {
                Storage::disk('public')->delete($topic->attachment_path);

                $payload['attachment_path'] = null;
                $payload['attachment_original_name'] = null;
                $payload['attachment_mime_type'] = null;
                $payload['attachment_extension'] = null;
                $payload['attachment_size'] = 0;
            }

            if ($request->hasFile('attachment')) {
                $attachment = $request->file('attachment');

                if ($topic->attachment_path) {
                    Storage::disk('public')->delete($topic->attachment_path);
                }

                $payload['attachment_path'] = $attachment->store('forum_attachments', 'public');
                $payload['attachment_original_name'] = $attachment->getClientOriginalName();
                $payload['attachment_mime_type'] = $attachment->getClientMimeType() ?: $attachment->getMimeType() ?: 'application/octet-stream';
                $payload['attachment_extension'] = strtolower((string) ($attachment->getClientOriginalExtension() ?: $attachment->extension() ?: ''));
                $payload['attachment_size'] = $attachment->getSize() ?: 0;
            }

            $topic->update($payload);
        });

        return response()->json([
            'data' => new ForumTopicResource($topic->fresh(['school', 'schoolClass', 'creator'])->loadCount('discussions')),
        ]);
    }

    public function destroy(string $externalId): JsonResponse
    {
        $topic = ForumTopic::query()->where('external_id', $externalId)->firstOrFail();

        if ($topic->attachment_path) {
            Storage::disk('public')->delete($topic->attachment_path);
        }

        $topic->delete();

        return response()->json([
            'data' => ['message' => 'Tópico removido com sucesso.'],
        ]);
    }

    private function resolveScopeIdentifiers(
        Request $request,
        string $scope,
        mixed $schoolExternalId,
        mixed $classExternalId,
    ): array {
        $user = $request->user();
        $tenantId = app()->bound('tenant') ? (int) app('tenant') : null;

        if ($scope === 'global') {
            return ['global', null, null];
        }

        if ($scope === 'school') {
            if ($user->isAdmin()) {
                if ($tenantId) {
                    return ['school', $tenantId, null];
                }

                $schoolId = School::query()->where('external_id', (string) $schoolExternalId)->value('id');
                abort_if(!$schoolId, 422, 'Escola informada para o tópico não encontrada.');

                return ['school', (int) $schoolId, null];
            }

            abort_if(!$tenantId, 403, 'Contexto da escola não encontrado.');

            return ['school', $tenantId, null];
        }

        abort_unless($scope === 'class', 422, 'Escopo de tópico inválido.');

        $classQuery = SchoolClass::query()->where('external_id', (string) $classExternalId);

        if (!$user->isAdmin() || $tenantId) {
            $classQuery->where('school_id', $tenantId ?: $user->school_id);
        }

        $class = $classQuery->first();
        abort_if(!$class, 422, 'Turma informada para o tópico não encontrada.');

        if ($schoolExternalId) {
            $expectedSchoolId = School::query()->where('external_id', (string) $schoolExternalId)->value('id');

            abort_if(
                $expectedSchoolId && (int) $class->school_id !== (int) $expectedSchoolId,
                422,
                'A turma informada não pertence à escola selecionada.',
            );
        }

        return ['class', (int) $class->school_id, (int) $class->id];
    }

    private function sanitizeTags(mixed $tags): array
    {
        if (!is_array($tags)) {
            return [];
        }

        return collect($tags)
            ->filter(fn ($tag) => is_string($tag) || is_numeric($tag))
            ->map(fn ($tag) => trim((string) $tag))
            ->filter(fn (string $tag) => $tag !== '')
            ->unique()
            ->values()
            ->all();
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
