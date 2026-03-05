<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SchoolClassResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'external_id' => $this->external_id,
            'school_external_id' => $this->school?->external_id,
            'school_name' => $this->school?->name,
            'name' => $this->name,
            'year' => $this->year,
            'subjects_count' => $this->whenCounted('subjects'),
            'enrollments_count' => $this->whenCounted('enrollments'),
            'subjects' => SubjectResource::collection($this->whenLoaded('subjects')),
            'users' => UserResource::collection($this->whenLoaded('enrollments', function () {
                return $this->enrollments
                    ->pluck('user')
                    ->filter()
                    ->unique('external_id')
                    ->values();
            })),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
