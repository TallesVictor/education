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
        $query = Permission::query();

        foreach ($this->normalizeFilterValues($request->input('name')) as $nameFilter) {
            $query->where('name', 'like', '%'.$nameFilter.'%');
        }

        foreach ($this->normalizeFilterValues($request->input('key')) as $keyFilter) {
            $query->where('key', 'like', '%'.$keyFilter.'%');
        }

        foreach ($this->normalizeFilterValues($request->input('module')) as $moduleFilter) {
            $query->where('module', 'like', '%'.$moduleFilter.'%');
        }

        $permissions = $query
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

    private function normalizeFilterValues(mixed $rawValues): array
    {
        $values = is_array($rawValues) ? $rawValues : [$rawValues];

        return collect($values)
            ->filter(fn ($value) => is_string($value) || is_numeric($value))
            ->map(fn ($value) => trim((string) $value))
            ->filter(fn (string $value) => $value !== '')
            ->values()
            ->all();
    }
}
