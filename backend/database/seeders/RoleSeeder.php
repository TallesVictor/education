<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    private const TARGET_COUNT = 100;

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
            Role::query()->firstOrCreate(
                ['name' => $name],
                ['is_system' => true],
            );
        });

        $additionalCount = max(0, self::TARGET_COUNT - count($systemRoles));

        for ($index = 1; $index <= $additionalCount; $index++) {
            Role::query()->firstOrCreate(
                ['name' => sprintf('Perfil %03d', $index)],
                ['is_system' => false],
            );
        }
    }
}
