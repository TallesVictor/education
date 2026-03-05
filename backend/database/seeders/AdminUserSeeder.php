<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Models\UserSchoolRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::query()->where('name', 'Admin')->firstOrFail();

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Administrador Global',
                'social_name' => 'Admin',
                'password' => Hash::make('admin123'),
            ],
        );

        UserSchoolRole::query()->withTrashed()->updateOrCreate(
            ['user_id' => $admin->id, 'school_id' => null],
            ['role_id' => $adminRole->id, 'deleted_at' => null],
        );
    }
}
