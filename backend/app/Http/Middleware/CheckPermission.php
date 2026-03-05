<?php

namespace App\Http\Middleware;

use App\Models\Permission;
use App\Models\UserSchoolRole;
use App\Support\TenantCache;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(401, 'Não autenticado.');
        }

        if ($user->isAdmin()) {
            return $next($request);
        }

        $tenantId = app()->bound('tenant')
            ? app('tenant')
            : $user->school_id;

        if (!$tenantId) {
            abort(403, 'Contexto da escola não encontrado.');
        }

        $roleId = UserSchoolRole::query()
            ->where('user_id', $user->id)
            ->where('school_id', $tenantId)
            ->value('role_id');

        if (!$roleId) {
            abort(403, 'Perfil do usuário não encontrado no tenant ativo.');
        }

        $cacheKey = TenantCache::rolePermissionsKey((string) $tenantId, (int) $roleId);

        $permissions = Cache::remember($cacheKey, TenantCache::PERMISSIONS_TTL, function () use ($roleId) {
            return Permission::query()
                ->select('permissions.key')
                ->join('role_permissions', 'role_permissions.permission_id', '=', 'permissions.id')
                ->where('role_permissions.role_id', $roleId)
                ->whereNull('permissions.deleted_at')
                ->pluck('permissions.key')
                ->values()
                ->all();
        });

        $requiredPermission = str_contains($module, '.')
            ? $module
            : sprintf('%s.manage', $module);

        if (!in_array($requiredPermission, $permissions, true)) {
            abort(403, 'Você não tem permissão para acessar este recurso.');
        }

        return $next($request);
    }
}
