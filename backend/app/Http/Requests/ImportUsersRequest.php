<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:xlsx,csv,txt'],
            'role_external_id' => ['required', 'string', 'size:21'],
            'school_external_id' => ['nullable', 'string', 'size:21'],
            'preview' => ['nullable', 'boolean'],
        ];
    }
}
