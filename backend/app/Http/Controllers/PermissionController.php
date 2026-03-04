<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePermissionRequest;
use App\Http\Requests\UpdatePermissionRequest;
use App\Http\Resources\PermissionResource;
use App\Models\Permission;
use App\Support\TenantCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PermissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $permissions = Permission::query()
            ->when($request->string('module')->isNotEmpty(), function ($query) use ($request) {
                $query->where('module', $request->string('module'));
            })
            ->orderBy('module')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => PermissionResource::collection($permissions),
        ]);
    }

    public function show(string $externalId): JsonResponse
    {
        $permission = Permission::query()->where('external_id', $externalId)->firstOrFail();

        return response()->json([
            'data' => new PermissionResource($permission),
        ]);
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $permission = Permission::query()->create($request->validated());
        TenantCache::flushRolesCache();
        TenantCache::flushAllPermissionCaches();

        return response()->json([
            'data' => new PermissionResource($permission),
        ], 201);
    }

    public function update(UpdatePermissionRequest $request, string $externalId): JsonResponse
    {
        $permission = Permission::query()->where('external_id', $externalId)->firstOrFail();

        if ($request->filled('key')) {
            $exists = Permission::query()
                ->where('key', $request->string('key'))
                ->where('id', '!=', $permission->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'key' => ['Chave de permissão já está em uso.'],
                ]);
            }
        }

        $permission->update($request->validated());
        TenantCache::flushRolesCache();
        TenantCache::flushAllPermissionCaches();

        return response()->json([
            'data' => new PermissionResource($permission),
        ]);
    }

    public function destroy(string $externalId): JsonResponse
    {
        $permission = Permission::query()->where('external_id', $externalId)->firstOrFail();
        $permission->delete();

        TenantCache::flushRolesCache();
        TenantCache::flushAllPermissionCaches();

        return response()->json([
            'data' => ['message' => 'Permissão removida com sucesso.'],
        ]);
    }
}
