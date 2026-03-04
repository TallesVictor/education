<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnrollmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'external_id' => $this->external_id,
            'user_external_id' => $this->user?->external_id,
            'user_name' => $this->user?->displayName(),
            'class_external_id' => $this->schoolClass?->external_id,
            'class_name' => $this->schoolClass?->name,
            'subject_external_id' => $this->subject?->external_id,
            'subject_name' => $this->subject?->name,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
