<?php

namespace App\Http\Requests;

use App\Rules\CpfRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'social_name' => ['nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:6'],
            'cpf' => ['nullable', 'string', 'max:14', new CpfRule()],
            'phone' => ['nullable', 'string', 'max:20'],
            'role_external_id' => ['nullable', 'string', 'size:21'],
        ];
    }
}
