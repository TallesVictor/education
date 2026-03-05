<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['name' => 'Gerenciar Usuários', 'key' => 'users.manage', 'module' => 'users'],
            ['name' => 'Gerenciar Escolas', 'key' => 'schools.manage', 'module' => 'schools'],
            ['name' => 'Gerenciar Disciplinas', 'key' => 'subjects.manage', 'module' => 'subjects'],
            ['name' => 'Gerenciar Turmas', 'key' => 'classes.manage', 'module' => 'classes'],
            ['name' => 'Visualizar Materiais Didáticos', 'key' => 'materials.view', 'module' => 'materials'],
            ['name' => 'Gerenciar Materiais Didáticos', 'key' => 'materials.manage', 'module' => 'materials'],
            ['name' => 'Gerenciar Perfis', 'key' => 'roles.manage', 'module' => 'roles'],
            ['name' => 'Gerenciar Permissões', 'key' => 'permissions.manage', 'module' => 'permissions'],
            ['name' => 'Gerenciar Vínculos', 'key' => 'enrollments.manage', 'module' => 'enrollments'],
            ['name' => 'Visualizar Fórum', 'key' => 'forums.view', 'module' => 'forums'],
            ['name' => 'Gerenciar Tópicos do Fórum', 'key' => 'forums.topics', 'module' => 'forums'],
            ['name' => 'Participar de Discussões do Fórum', 'key' => 'forums.discussions', 'module' => 'forums'],
        ];

        foreach ($permissions as $permission) {
            Permission::query()->updateOrCreate(
                ['key' => $permission['key']],
                [
                    'name' => $permission['name'],
                    'module' => $permission['module'],
                ],
            );
        }
    }
}
