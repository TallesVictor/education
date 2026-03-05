<?php

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()
            ->with(['school', 'schoolRoles.role', 'schoolRoles.school'])
            ->where('email', $request->string('email'))
            ->first();

        if (!$user || !Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        $tokenExpiryMinutes = (int) config('sanctum.expiration', 120);
        $tokenExpiresAt = now()->addMinutes($tokenExpiryMinutes);

        $token = $user->createToken(
            $request->input('device_name', 'web'),
            ['*'],
            $tokenExpiresAt
        )->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
                'roles' => $user->schoolRoles->map(function ($item) {
                    return [
                        'school_external_id' => $item->school?->external_id,
                        'school_name' => $item->school?->name,
                        'role_external_id' => $item->role?->external_id,
                        'role_name' => $item->role?->name,
                    ];
                })->values(),
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['school', 'schoolRoles.role', 'schoolRoles.school']);

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'roles' => $user->schoolRoles->map(function ($item) {
                    return [
                        'school_external_id' => $item->school?->external_id,
                        'school_name' => $item->school?->name,
                        'role_external_id' => $item->role?->external_id,
                        'role_name' => $item->role?->name,
                    ];
                })->values(),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'data' => ['message' => 'Logout realizado com sucesso.'],
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink([
            'email' => $request->string('email'),
        ]);

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'data' => ['message' => __($status)],
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->validated(),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'data' => ['message' => __($status)],
        ]);
    }
}
