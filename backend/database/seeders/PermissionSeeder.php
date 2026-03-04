<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    private const TARGET_COUNT = 100;

    public function run(): void
    {
        $permissions = [
            ['name' => 'Gerenciar Usuários', 'key' => 'users.manage', 'module' => 'users'],
            ['name' => 'Gerenciar Escolas', 'key' => 'schools.manage', 'module' => 'schools'],
            ['name' => 'Gerenciar Disciplinas', 'key' => 'subjects.manage', 'module' => 'subjects'],
            ['name' => 'Gerenciar Turmas', 'key' => 'classes.manage', 'module' => 'classes'],
            ['name' => 'Gerenciar Perfis', 'key' => 'roles.manage', 'module' => 'roles'],
            ['name' => 'Gerenciar Permissões', 'key' => 'permissions.manage', 'module' => 'permissions'],
            ['name' => 'Gerenciar Vínculos', 'key' => 'enrollments.manage', 'module' => 'enrollments'],
        ];

        foreach ($permissions as $permission) {
            Permission::query()->firstOrCreate(
                ['key' => $permission['key']],
                [
                    'name' => $permission['name'],
                    'module' => $permission['module'],
                ],
            );
        }

        $additionalCount = max(0, self::TARGET_COUNT - count($permissions));

        for ($index = 1; $index <= $additionalCount; $index++) {
            $module = sprintf('module_%02d', (($index - 1) % 10) + 1);

            Permission::query()->firstOrCreate(
                ['key' => sprintf('%s.generated_%03d', $module, $index)],
                [
                    'name' => sprintf('Permissão %03d', $index),
                    'module' => $module,
                ],
            );
        }
    }
}
