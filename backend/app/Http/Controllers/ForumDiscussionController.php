<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreForumDiscussionRequest;
use App\Http\Requests\UpdateForumDiscussionRequest;
use App\Http\Resources\ForumDiscussionResource;
use App\Models\ForumDiscussion;
use App\Models\ForumTopic;
use App\Support\ForumVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForumDiscussionController extends Controller
{
    public function __construct(private readonly ForumVisibility $forumVisibility) {}

    public function index(Request $request, string $externalId): JsonResponse
    {
        $topic = ForumTopic::query()->where('external_id', $externalId)->firstOrFail();
        $this->forumVisibility->assertUserCanViewTopic($topic, $request);

        $query = ForumDiscussion::query()
            ->with(['topic', 'parent', 'author'])
            ->withCount('likes')
            ->where('topic_id', $topic->id)
            ->orderBy('created_at');

        if ($request->user()) {
            $query->withExists([
                'likes as liked_by_me' => fn ($likeQuery) => $likeQuery->where('users.id', $request->user()->id),
            ]);
        }

        $discussions = $query->get();

        return response()->json([
            'data' => ForumDiscussionResource::collection($discussions),
        ]);
    }

    public function store(StoreForumDiscussionRequest $request, string $externalId): JsonResponse
    {
        $topic = ForumTopic::query()->where('external_id', $externalId)->firstOrFail();
        $this->forumVisibility->assertUserCanViewTopic($topic, $request);

        $parentId = null;
        $depth = 1;

        $parentExternalId = trim((string) $request->input('parent_external_id', ''));
        if ($parentExternalId !== '') {
            $parentDiscussion = ForumDiscussion::query()
                ->where('topic_id', $topic->id)
                ->where('external_id', $parentExternalId)
                ->first();

            abort_if(!$parentDiscussion, 422, 'Discussão pai não encontrada para o tópico informado.');

            $parentId = (int) $parentDiscussion->id;
            $depth = ((int) $parentDiscussion->depth) + 1;
        }

        abort_if($depth > 3, 422, 'A discussão permite no máximo 3 níveis de resposta.');

        $discussion = ForumDiscussion::query()->create([
            'topic_id' => (int) $topic->id,
            'parent_id' => $parentId,
            'user_id' => (int) $request->user()->id,
            'content' => (string) $request->string('content'),
            'depth' => $depth,
        ]);

        $discussion = ForumDiscussion::query()
            ->with(['topic', 'parent', 'author'])
            ->withCount('likes')
            ->where('id', $discussion->id)
            ->firstOrFail();

        return response()->json([
            'data' => new ForumDiscussionResource($discussion),
        ], 201);
    }

    public function update(UpdateForumDiscussionRequest $request, string $externalId): JsonResponse
    {
        $discussion = ForumDiscussion::query()
            ->with(['topic', 'parent', 'author'])
            ->where('external_id', $externalId)
            ->firstOrFail();

        $this->forumVisibility->assertUserCanViewTopic($discussion->topic, $request);
        $this->assertCanManageDiscussion($discussion, $request);

        $discussion->update([
            'content' => (string) $request->string('content'),
        ]);

        $discussion = ForumDiscussion::query()
            ->with(['topic', 'parent', 'author'])
            ->withCount('likes')
            ->where('id', $discussion->id)
            ->firstOrFail();

        return response()->json([
            'data' => new ForumDiscussionResource($discussion),
        ]);
    }

    public function destroy(Request $request, string $externalId): JsonResponse
    {
        $discussion = ForumDiscussion::query()
            ->with('topic')
            ->where('external_id', $externalId)
            ->firstOrFail();

        $this->forumVisibility->assertUserCanViewTopic($discussion->topic, $request);
        $this->assertCanManageDiscussion($discussion, $request);

        $discussion->delete();

        return response()->json([
            'data' => ['message' => 'Discussão removida com sucesso.'],
        ]);
    }

    public function toggleLike(Request $request, string $externalId): JsonResponse
    {
        $discussion = ForumDiscussion::query()
            ->with('topic')
            ->where('external_id', $externalId)
            ->firstOrFail();

        $this->forumVisibility->assertUserCanViewTopic($discussion->topic, $request);

        $alreadyLiked = $discussion->likes()->where('users.id', $request->user()->id)->exists();

        if ($alreadyLiked) {
            $discussion->likes()->detach($request->user()->id);
        } else {
            $discussion->likes()->attach($request->user()->id);
        }

        return response()->json([
            'data' => [
                'liked' => !$alreadyLiked,
                'likes_count' => $discussion->likes()->count(),
            ],
        ]);
    }

    private function assertCanManageDiscussion(ForumDiscussion $discussion, Request $request): void
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return;
        }

        abort_unless((int) $discussion->user_id === (int) $user->id, 403, 'Você só pode editar ou remover suas próprias discussões.');
    }
}
