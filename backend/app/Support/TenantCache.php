<?php

namespace App\Support;

use App\Models\Role;
use App\Models\School;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class TenantCache
{
    public const ROLES_TTL = 1800;

    public const SUBJECTS_TTL = 900;

    public const CLASSES_TTL = 900;

    public const MATERIALS_TTL = 900;

    public const SETTINGS_TTL = 3600;

    public const PERMISSIONS_TTL = 3600;

    public static function tenantSegment(?Request $request = null): string
    {
        if (app()->bound('tenant')) {
            return (string) app('tenant');
        }

        $user = $request?->user();

        if ($user && !$user->isAdmin() && $user->school_id) {
            return (string) $user->school_id;
        }

        return 'global';
    }

    public static function rolesKey(string $tenantSegment): string
    {
        return sprintf('school_%s:roles', $tenantSegment);
    }

    public static function subjectsKey(string $tenantSegment): string
    {
        return sprintf('school_%s:subjects', $tenantSegment);
    }

    public static function classesKey(string $tenantSegment): string
    {
        return sprintf('school_%s:classes', $tenantSegment);
    }

    public static function materialsKey(string $tenantSegment): string
    {
        return sprintf('school_%s:materials', $tenantSegment);
    }

    public static function settingsKey(int $schoolId): string
    {
        return sprintf('school_%d:settings', $schoolId);
    }

    public static function rolePermissionsKey(string $tenantSegment, int $roleId): string
    {
        return sprintf('school_%s:permissions:%d', $tenantSegment, $roleId);
    }

    /**
     * @return list<string>
     */
    public static function allTenantSegments(): array
    {
        $segments = School::query()
            ->pluck('id')
            ->map(fn ($id) => (string) $id)
            ->all();

        $segments[] = 'global';

        return array_values(array_unique($segments));
    }

    public static function flushRolesCache(): void
    {
        foreach (self::allTenantSegments() as $tenantSegment) {
            Cache::forget(self::rolesKey($tenantSegment));
        }
    }

    public static function flushSubjectsCache(): void
    {
        foreach (self::allTenantSegments() as $tenantSegment) {
            Cache::forget(self::subjectsKey($tenantSegment));
        }
    }

    public static function flushClassesCache(): void
    {
        foreach (self::allTenantSegments() as $tenantSegment) {
            Cache::forget(self::classesKey($tenantSegment));
        }
    }

    public static function flushTeachingMaterialsCache(): void
    {
        foreach (self::allTenantSegments() as $tenantSegment) {
            Cache::forget(self::materialsKey($tenantSegment));
        }
    }

    public static function flushSettingsCache(?int $schoolId = null): void
    {
        if ($schoolId !== null) {
            Cache::forget(self::settingsKey($schoolId));

            return;
        }

        foreach (School::query()->pluck('id') as $id) {
            Cache::forget(self::settingsKey((int) $id));
        }
    }

    public static function flushPermissionCacheForRole(int $roleId): void
    {
        foreach (self::allTenantSegments() as $tenantSegment) {
            Cache::forget(self::rolePermissionsKey($tenantSegment, $roleId));
        }
    }

    public static function flushAllPermissionCaches(): void
    {
        $roleIds = Role::query()->pluck('id')->all();

        foreach ($roleIds as $roleId) {
            self::flushPermissionCacheForRole((int) $roleId);
        }
    }
}
