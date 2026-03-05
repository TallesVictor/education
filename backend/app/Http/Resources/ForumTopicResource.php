<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ForumTopicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $attachmentUrl = $this->attachment_path ? asset('storage/'.$this->attachment_path) : null;

        return [
            'external_id' => $this->external_id,
            'scope' => $this->scope,
            'school_external_id' => $this->school?->external_id,
            'school_name' => $this->school?->name,
            'class_external_id' => $this->schoolClass?->external_id,
            'class_name' => $this->schoolClass?->name,
            'title' => $this->title,
            'description' => $this->description,
            'attachment_original_name' => $this->attachment_original_name,
            'attachment_mime_type' => $this->attachment_mime_type,
            'attachment_extension' => $this->attachment_extension,
            'attachment_size' => (int) ($this->attachment_size ?? 0),
            'attachment_url' => $attachmentUrl,
            'tags' => $this->tags ?? [],
            'expires_at' => $this->expires_at,
            'is_expired' => (bool) ($this->expires_at?->isPast()),
            'is_pinned' => (bool) $this->is_pinned,
            'discussion_count' => $this->whenCounted('discussions'),
            'created_by' => [
                'external_id' => $this->creator?->external_id,
                'name' => $this->creator?->displayName(),
                'email' => $this->creator?->email,
            ],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
