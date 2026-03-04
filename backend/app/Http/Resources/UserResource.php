<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $roleAssignment = null;

        if ($this->relationLoaded('schoolRoles')) {
            $roleAssignment = $this->schoolRoles->firstWhere('school_id', $this->school_id)
                ?? $this->schoolRoles->first();
        }

        return [
            'external_id' => $this->external_id,
            'school_external_id' => $this->school?->external_id,
            'name' => $this->name,
            'social_name' => $this->social_name,
            'display_name' => $this->social_name ?: $this->name,
            'email' => $this->email,
            'cpf' => $this->cpf,
            'phone' => $this->phone,
            'role_external_id' => $roleAssignment?->role?->external_id,
            'role_name' => $roleAssignment?->role?->name,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
