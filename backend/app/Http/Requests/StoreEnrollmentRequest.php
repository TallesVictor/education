<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEnrollmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_external_id' => ['required', 'string', 'size:21'],
            'class_external_id' => ['required', 'string', 'size:21'],
            'subject_external_id' => ['required', 'string', 'size:21'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ];
    }
}
