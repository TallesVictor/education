<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'year' => ['sometimes', 'required', 'integer', 'between:2000,2100'],
            'subject_external_ids' => ['nullable', 'array'],
            'subject_external_ids.*' => ['string', 'size:21'],
        ];
    }
}
