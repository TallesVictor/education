<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hasSchoolsLoaded = $this->relationLoaded('schools');
        $primarySchool = $hasSchoolsLoaded ? $this->schools->first() : null;
        $fallbackSchool = $this->relationLoaded('school') ? $this->school : null;

        return [
            'external_id' => $this->external_id,
            'school_external_id' => $primarySchool?->external_id ?? $fallbackSchool?->external_id,
            'school_name' => $primarySchool?->name ?? $fallbackSchool?->name,
            'school_external_ids' => $this->whenLoaded('schools', fn () => $this->schools->pluck('external_id')->values()),
            'schools' => $this->whenLoaded('schools', function () {
                return $this->schools->map(fn ($school) => [
                    'external_id' => $school->external_id,
                    'name' => $school->name,
                ])->values();
            }),
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
