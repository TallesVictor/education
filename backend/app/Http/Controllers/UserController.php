<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportUsersRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Models\UserSchoolRole;
use App\Services\ImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function __construct(private readonly ImportService $importService) {}

    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->with(['school', 'schoolRoles.role'])
            ->when($request->string('name')->isNotEmpty(), function ($q) use ($request) {
                $q->where('name', 'like', '%'.$request->string('name').'%');
            })
            ->when($request->string('email')->isNotEmpty(), function ($q) use ($request) {
                $q->where('email', 'like', '%'.$request->string('email').'%');
            })
            ->when($request->string('role_external_id')->isNotEmpty(), function ($q) use ($request) {
                $q->whereHas('schoolRoles.role', function ($sub) use ($request) {
                    $sub->where('external_id', $request->string('role_external_id'));
                });
            })
            ->orderByDesc('id');

        if (!$request->user()->isAdmin()) {
            $query->where('school_id', app()->bound('tenant') ? app('tenant') : null);
        }

        $users = $query->paginate((int) $request->input('per_page', 15));

        return response()->json([
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function show(Request $request, string $externalId): JsonResponse
    {
        $query = User::query()->with(['school', 'schoolRoles.role'])->where('external_id', $externalId);

        if (!$request->user()->isAdmin()) {
            $query->where('school_id', app()->bound('tenant') ? app('tenant') : null);
        }

        $user = $query->firstOrFail();

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $schoolId = $this->resolveSchoolId($request);
        $role = Role::query()->where('external_id', $request->string('role_external_id'))->firstOrFail();
        $this->assertRoleAssignmentAllowed($request, $role);

        $user = User::query()->create([
            'school_id' => $schoolId,
            'name' => $request->string('name'),
            'social_name' => $request->input('social_name'),
            'email' => $request->string('email'),
            'password' => $request->string('password'),
            'cpf' => $request->input('cpf'),
            'phone' => $request->input('phone'),
        ]);

        UserSchoolRole::query()->create([
            'user_id' => $user->id,
            'school_id' => $schoolId,
            'role_id' => $role->id,
        ]);

        return response()->json([
            'data' => new UserResource($user->load('school')),
        ], 201);
    }

    public function update(UpdateUserRequest $request, string $externalId): JsonResponse
    {
        $query = User::query()->where('external_id', $externalId);

        if (!$request->user()->isAdmin()) {
            $query->where('school_id', app()->bound('tenant') ? app('tenant') : null);
        }

        $user = $query->firstOrFail();

        if ($request->filled('email')) {
            $exists = User::query()
                ->where('email', $request->string('email'))
                ->where('id', '!=', $user->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages(['email' => ['E-mail já está em uso.']]);
            }
        }

        if ($request->filled('cpf')) {
            $exists = User::query()
                ->where('cpf', $request->string('cpf'))
                ->where('id', '!=', $user->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages(['cpf' => ['CPF já está em uso.']]);
            }
        }

        $payload = $request->only(['name', 'social_name', 'email', 'cpf', 'phone']);

        if ($request->filled('password')) {
            $payload['password'] = $request->string('password');
        }

        $user->update($payload);

        if ($request->filled('role_external_id')) {
            $role = Role::query()->where('external_id', $request->string('role_external_id'))->firstOrFail();
            $this->assertRoleAssignmentAllowed($request, $role);
            $schoolId = $user->school_id;

            UserSchoolRole::query()
                ->withTrashed()
                ->updateOrCreate(
                    ['user_id' => $user->id, 'school_id' => $schoolId],
                    ['role_id' => $role->id, 'deleted_at' => null],
                );
        }

        return response()->json([
            'data' => new UserResource($user->fresh('school')),
        ]);
    }

    public function destroy(Request $request, string $externalId): JsonResponse
    {
        $query = User::query()->where('external_id', $externalId);

        if (!$request->user()->isAdmin()) {
            $query->where('school_id', app()->bound('tenant') ? app('tenant') : null);
        }

        $user = $query->firstOrFail();
        $user->delete();

        UserSchoolRole::query()->where('user_id', $user->id)->delete();

        return response()->json([
            'data' => ['message' => 'Usuário removido com sucesso.'],
        ]);
    }

    public function import(ImportUsersRequest $request): JsonResponse
    {
        $schoolId = $this->resolveSchoolId($request);

        $role = Role::query()
            ->where('external_id', $request->string('role_external_id'))
            ->firstOrFail();
        $this->assertRoleAssignmentAllowed($request, $role);

        if ($request->boolean('preview')) {
            $preview = $this->importService->previewUsers(
                file: $request->file('file'),
                schoolId: $schoolId,
                roleId: $role->id,
            );

            return response()->json([
                'data' => [
                    'inserted' => $preview['inserted'],
                    'updated' => $preview['updated'],
                    'errors_count' => count($preview['errors']),
                    'errors' => $preview['errors'],
                    'preview_rows' => $preview['preview_rows'],
                ],
            ]);
        }

        $result = $this->importService->importUsers(
            file: $request->file('file'),
            schoolId: $schoolId,
            roleId: $role->id,
        );

        return response()->json([
            'data' => [
                'inserted' => $result['inserted'],
                'updated' => $result['updated'],
                'errors_count' => count($result['errors']),
                'errors' => $result['errors'],
                'error_report_url' => $result['error_report_url'],
            ],
        ]);
    }

    public function template()
    {
        $csv = implode("\n", [
            'nome,email,senha,nome_social,cpf,telefone',
            'João Silva,joao@email.com,senha123,Joãozinho,123.456.789-00,(11) 99999-9999',
        ]);

        return Response::streamDownload(function () use ($csv): void {
            echo $csv;
        }, 'modelo-importacao-usuarios.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function resolveSchoolId(Request $request): ?int
    {
        if (!$request->user()->isAdmin()) {
            return app()->bound('tenant') ? app('tenant') : null;
        }

        if (!$request->filled('school_external_id')) {
            return null;
        }

        $schoolId = School::query()
            ->where('external_id', $request->string('school_external_id'))
            ->value('id');

        if (!$schoolId) {
            throw ValidationException::withMessages([
                'school_external_id' => ['Escola informada não encontrada.'],
            ]);
        }

        return (int) $schoolId;
    }

    private function assertRoleAssignmentAllowed(Request $request, Role $role): void
    {
        if ($role->name === 'Admin' && !$request->user()->isAdmin()) {
            abort(403, 'Atribuição do perfil Admin permitida apenas para administradores.');
        }
    }
}
