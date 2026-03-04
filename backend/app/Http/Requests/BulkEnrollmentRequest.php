<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkEnrollmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'class_external_id' => ['required', 'string', 'size:21'],
            'subject_external_id' => ['required', 'string', 'size:21'],
            'student_external_ids' => ['required', 'array', 'min:1'],
            'student_external_ids.*' => ['string', 'size:21'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ];
    }
}
