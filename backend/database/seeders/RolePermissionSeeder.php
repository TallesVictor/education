<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $admin = Role::query()->where('name', 'Admin')->first();
        $diretor = Role::query()->where('name', 'Diretor')->first();
        $coordenador = Role::query()->where('name', 'Coordenador')->first();
        $professor = Role::query()->where('name', 'Professor')->first();
        $aluno = Role::query()->where('name', 'Aluno')->first();

        $permissions = Permission::query()->pluck('id', 'key');

        $admin?->permissions()->sync($permissions->values()->all());

        $diretor?->permissions()->sync(array_values(array_filter([
            $permissions['users.manage'] ?? null,
            $permissions['subjects.manage'] ?? null,
            $permissions['classes.manage'] ?? null,
            $permissions['materials.view'] ?? null,
            $permissions['materials.manage'] ?? null,
            $permissions['enrollments.manage'] ?? null,
            $permissions['forums.view'] ?? null,
            $permissions['forums.topics'] ?? null,
            $permissions['forums.discussions'] ?? null,
        ])));

        $coordenador?->permissions()->sync(array_values(array_filter([
            $permissions['subjects.manage'] ?? null,
            $permissions['classes.manage'] ?? null,
            $permissions['materials.view'] ?? null,
            $permissions['materials.manage'] ?? null,
            $permissions['enrollments.manage'] ?? null,
            $permissions['forums.view'] ?? null,
            $permissions['forums.topics'] ?? null,
            $permissions['forums.discussions'] ?? null,
        ])));

        $professor?->permissions()->sync(array_values(array_filter([
            $permissions['materials.view'] ?? null,
            $permissions['materials.manage'] ?? null,
            $permissions['forums.view'] ?? null,
            $permissions['forums.topics'] ?? null,
            $permissions['forums.discussions'] ?? null,
        ])));

        $aluno?->permissions()->sync(array_values(array_filter([
            $permissions['materials.view'] ?? null,
            $permissions['forums.view'] ?? null,
            $permissions['forums.discussions'] ?? null,
        ])));
    }
}
