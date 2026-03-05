<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubjectRequest extends FormRequest
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
            'description' => ['nullable', 'string'],
            'class_external_ids' => ['nullable', 'array'],
            'class_external_ids.*' => ['string', 'size:21'],
            'image' => [
                'nullable',
                'image',
                'max:2048',
                'mimes:jpg,jpeg,png,webp,gif',
                'mimetypes:image/jpeg,image/png,image/webp,image/gif',
            ],
        ];
    }
}
