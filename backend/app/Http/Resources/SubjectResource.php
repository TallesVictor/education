<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'external_id' => $this->external_id,
            'school_external_id' => $this->school?->external_id,
            'name' => $this->name,
            'description' => $this->description,
            'image_path' => $this->image_path,
            'image_url' => $this->image_path ? asset('storage/'.$this->image_path) : null,
            'classes_count' => $this->whenCounted('classes'),
            'classes' => $this->whenLoaded('classes', function () {
                return $this->classes->map(fn ($class) => [
                    'external_id' => $class->external_id,
                    'name' => $class->name,
                    'year' => $class->year,
                ]);
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
