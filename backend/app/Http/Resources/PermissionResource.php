<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'external_id' => $this->external_id,
            'name' => $this->name,
            'key' => $this->key,
            'module' => $this->module,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
