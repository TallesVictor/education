<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreForumTopicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'scope' => ['required', 'string', 'in:global,school,class'],
            'school_external_id' => ['nullable', 'string', 'size:21'],
            'class_external_id' => ['nullable', 'string', 'size:21'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'tags' => ['nullable', 'array', 'max:15'],
            'tags.*' => ['string', 'max:40'],
            'expires_at' => ['nullable', 'date'],
            'is_pinned' => ['nullable', 'boolean'],
            'remove_attachment' => ['nullable', 'boolean'],
            'attachment' => [
                'nullable',
                'file',
                'max:15360',
                'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,csv,txt,odt,ods,odp,jpg,jpeg,png,webp,gif,zip,rar',
            ],
        ];
    }
}
