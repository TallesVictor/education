<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttachClassSubjectsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject_external_ids' => ['required', 'array', 'min:1'],
            'subject_external_ids.*' => ['string', 'size:21'],
        ];
    }
}
