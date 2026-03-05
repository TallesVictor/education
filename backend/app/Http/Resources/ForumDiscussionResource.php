<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ForumDiscussionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'external_id' => $this->external_id,
            'topic_external_id' => $this->topic?->external_id,
            'parent_external_id' => $this->parent?->external_id,
            'depth' => (int) $this->depth,
            'content' => $this->content,
            'likes_count' => (int) ($this->likes_count ?? 0),
            'liked_by_me' => (bool) ($this->liked_by_me ?? false),
            'author' => [
                'external_id' => $this->author?->external_id,
                'name' => $this->author?->displayName(),
                'email' => $this->author?->email,
            ],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
