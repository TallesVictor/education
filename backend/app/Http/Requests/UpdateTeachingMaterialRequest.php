<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTeachingMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'subject_external_ids' => ['nullable', 'array'],
            'subject_external_ids.*' => ['string', 'size:21'],
            'class_external_id' => ['nullable', 'string', 'size:21'],
            'published_at' => ['nullable', 'date'],
            'version' => ['nullable', 'string', 'max:50'],
            'is_visible_to_students' => ['nullable', 'boolean'],
            'file' => [
                'nullable',
                'file',
                'max:30720',
                'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,csv,txt,odt,ods,odp,jpg,jpeg,png,webp,gif,mp4,webm',
            ],
        ];
    }
}
