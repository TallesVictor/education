<?php

namespace App\Http\Resources;

use Carbon\Carbon;
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
            'start_date' => Carbon::parse($this->start_date)->format('d/M/Y H:i'), //$this->start_date,
            'end_date' => $this->end ? Carbon::parse($this->end)->format('d/M/Y H:i'): null,
        ];
    }
}
