<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SchoolResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'external_id' => $this->external_id,
            'name' => $this->name,
            'cnpj' => $this->cnpj,
            'type' => $this->type,
            'image_path' => $this->image_path,
            'image_url' => $this->image_path ? asset('storage/'.$this->image_path) : null,
            'zip_code' => $this->zip_code,
            'street' => $this->street,
            'neighborhood' => $this->neighborhood,
            'city' => $this->city,
            'state' => $this->state,
            'number' => $this->number,
            'complement' => $this->complement,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
