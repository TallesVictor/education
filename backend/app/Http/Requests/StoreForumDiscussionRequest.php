<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreForumDiscussionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'parent_external_id' => ['nullable', 'string', 'size:21'],
            'content' => ['required', 'string', 'max:5000'],
        ];
    }
}
