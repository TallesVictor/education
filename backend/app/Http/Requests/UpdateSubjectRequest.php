<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSubjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'school_external_id' => ['nullable', 'string', 'size:21'],
            'school_external_ids' => ['nullable', 'array'],
            'school_external_ids.*' => ['string', 'size:21'],
            'class_external_ids' => ['nullable', 'array'],
            'class_external_ids.*' => ['string', 'size:21'],
            'sync_schools' => ['nullable', 'boolean'],
            'sync_classes' => ['nullable', 'boolean'],
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
