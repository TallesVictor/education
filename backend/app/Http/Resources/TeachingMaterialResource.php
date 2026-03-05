<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeachingMaterialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $fileUrl = $this->file_path ? asset('storage/'.$this->file_path) : null;
        $previewKind = $this->resolvePreviewKind();

        return [
            'external_id' => $this->external_id,
            'school_external_id' => $this->school?->external_id,
            'class_external_id' => $this->schoolClass?->external_id,
            'class_name' => $this->schoolClass?->name,
            'title' => $this->title,
            'description' => $this->description,
            'file_original_name' => $this->file_original_name,
            'file_extension' => $this->file_extension,
            'file_mime_type' => $this->file_mime_type,
            'file_size' => $this->file_size,
            'file_path' => $this->file_path,
            'file_url' => $fileUrl,
            'preview_kind' => $previewKind,
            'preview_url' => $this->resolvePreviewUrl($fileUrl, $previewKind),
            'is_visible_to_students' => (bool) $this->is_visible_to_students,
            'published_at' => $this->published_at,
            'version' => $this->version,
            'subjects' => $this->whenLoaded('subjects', function () {
                return $this->subjects->map(fn ($subject) => [
                    'external_id' => $subject->external_id,
                    'name' => $subject->name,
                ]);
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function resolvePreviewKind(): string
    {
        $mimeType = strtolower((string) $this->file_mime_type);
        $extension = strtolower((string) $this->file_extension);

        if (str_starts_with($mimeType, 'image/')) {
            return 'image';
        }

        if (str_starts_with($mimeType, 'video/')) {
            return 'video';
        }

        if (
            str_starts_with($mimeType, 'application/pdf') ||
            str_starts_with($mimeType, 'text/') ||
            in_array($extension, ['pdf', 'txt', 'csv'], true)
        ) {
            return 'iframe';
        }

        if (in_array($extension, ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'], true)) {
            return 'iframe';
        }

        return 'none';
    }

    private function resolvePreviewUrl(?string $fileUrl, string $previewKind): ?string
    {
        if (!$fileUrl || $previewKind === 'none') {
            return null;
        }

        $extension = strtolower((string) $this->file_extension);

        if (in_array($extension, ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'], true)) {
            return 'https://view.officeapps.live.com/op/embed.aspx?src='.rawurlencode($fileUrl);
        }

        return $fileUrl;
    }
}
