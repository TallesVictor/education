<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'school_external_id' => ['nullable', 'string', 'size:21'],
            'name' => ['required', 'string', 'max:255'],
            'year' => ['required', 'integer', 'between:2000,2100'],
            'subject_external_ids' => ['nullable', 'array'],
            'subject_external_ids.*' => ['string', 'size:21'],
        ];
    }
}
