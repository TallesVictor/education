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
            'file' => [
                'required',
                'file',
                'max:5120',
                'mimes:xlsx,csv,txt',
                'mimetypes:text/plain,text/csv,application/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
            'role_external_id' => ['required', 'string', 'size:21'],
            'school_external_id' => ['nullable', 'string', 'size:21'],
            'preview' => ['nullable', 'boolean'],
        ];
    }
}
