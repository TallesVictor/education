<?php

namespace App\Http\Requests;

use App\Rules\CpfRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'school_external_id' => ['nullable', 'string', 'size:21'],
            'name' => ['required', 'string', 'max:255'],
            'social_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'cpf' => ['nullable', 'string', 'max:14', 'unique:users,cpf', new CpfRule()],
            'phone' => ['nullable', 'string', 'max:20'],
            'role_external_id' => ['required', 'string', 'size:21'],
        ];
    }
}
