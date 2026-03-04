<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRolePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'permission_external_ids' => ['required', 'array'],
            'permission_external_ids.*' => ['string', 'size:21'],
        ];
    }
}
