<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $systemRoles = [
            'Admin',
            'Diretor',
            'Coordenador',
            'Professor',
            'Aluno',
        ];

        collect($systemRoles)->each(function (string $name): void {
            Role::query()->updateOrCreate(
                ['name' => $name],
                ['is_system' => true],
            );
        });
    }
}
