<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRolePermissionsRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use App\Support\TenantCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min(200, (int) $request->input('per_page', 15)));
        $page = max(1, (int) $request->input('page', 1));
        $tenantSegment = TenantCache::tenantSegment($request);
        $cacheKey = TenantCache::rolesKey($tenantSegment);

        $roles = $this->loadRolesCollection($cacheKey);

        $paginator = new LengthAwarePaginator(
            items: $roles->forPage($page, $perPage)->values(),
            total: $roles->count(),
            perPage: $perPage,
            currentPage: $page,
            options: ['path' => request()->url(), 'query' => request()->query()],
        );

        return response()->json([
            'data' => RoleResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        if ($request->filled('is_system') && !$request->user()->isAdmin()) {
            abort(403, 'Apenas administradores podem alterar o indicador de perfil de sistema.');
        }

        if ((string) $request->string('name') === 'Admin' && !$request->user()->isAdmin()) {
            abort(403, 'Apenas administradores podem criar perfil Admin.');
        }

        $role = Role::query()->create($request->validated());

        TenantCache::flushRolesCache();

        return response()->json([
            'data' => new RoleResource($role),
        ], 201);
    }

    public function show(string $externalId): JsonResponse
    {
        $role = Role::query()->with('permissions')->where('external_id', $externalId)->firstOrFail();

        return response()->json([
            'data' => new RoleResource($role),
        ]);
    }

    public function update(UpdateRoleRequest $request, string $externalId): JsonResponse
    {
        $role = Role::query()->where('external_id', $externalId)->firstOrFail();

        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => ['Perfis de sistema não podem ser editados.'],
            ]);
        }

        if ($request->filled('is_system') && !$request->user()->isAdmin()) {
            abort(403, 'Apenas administradores podem alterar o indicador de perfil de sistema.');
        }

        if ((string) $request->string('name') === 'Admin' && !$request->user()->isAdmin()) {
            abort(403, 'Apenas administradores podem renomear perfil para Admin.');
        }

        $role->update($request->validated());

        TenantCache::flushRolesCache();

        return response()->json([
            'data' => new RoleResource($role),
        ]);
    }

    public function destroy(string $externalId): JsonResponse
    {
        $role = Role::query()->where('external_id', $externalId)->firstOrFail();

        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => ['Perfis de sistema não podem ser removidos.'],
            ]);
        }

        $role->delete();

        TenantCache::flushRolesCache();
        TenantCache::flushPermissionCacheForRole($role->id);

        return response()->json([
            'data' => ['message' => 'Perfil removido com sucesso.'],
        ]);
    }

    public function updatePermissions(UpdateRolePermissionsRequest $request, string $externalId): JsonResponse
    {
        $role = Role::query()->where('external_id', $externalId)->firstOrFail();

        if ($role->is_system && $role->name === 'Admin') {
            throw ValidationException::withMessages([
                'role' => ['As permissões do perfil Admin não podem ser alteradas.'],
            ]);
        }

        $role->permissions()->sync($request->input('permission_ids'));

        TenantCache::flushRolesCache();
        TenantCache::flushPermissionCacheForRole($role->id);

        return response()->json([
            'data' => new RoleResource($role->fresh('permissions')),
        ]);
    }

    private function loadRolesCollection(string $cacheKey)
    {
        $roles = Cache::remember($cacheKey, TenantCache::ROLES_TTL, function () {
            return Role::query()
                ->with('permissions')
                ->orderBy('name')
                ->get();
        });

        if ($roles->isEmpty()) {
            return $roles;
        }

        $cachedFirstExternalId = $roles->first()->external_id;

        $stillExists = Role::query()
            ->where('external_id', $cachedFirstExternalId)
            ->exists();

        if ($stillExists) {
            return $roles;
        }

        Cache::forget($cacheKey);

        return Cache::remember($cacheKey, TenantCache::ROLES_TTL, function () {
            return Role::query()
                ->with('permissions')
                ->orderBy('name')
                ->get();
        });
    }
}
