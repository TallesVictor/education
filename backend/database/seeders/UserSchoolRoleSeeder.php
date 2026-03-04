<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Models\UserSchoolRole;
use Illuminate\Database\Seeder;

class UserSchoolRoleSeeder extends Seeder
{
    public function run(): void
    {
        $roleIds = Role::query()
            ->where('name', '!=', 'Admin')
            ->orderBy('id')
            ->pluck('id')
            ->values();

        if ($roleIds->isEmpty()) {
            return;
        }

        $users = User::query()
            ->where('email', 'like', 'usuario.%@escola.local')
            ->whereNotNull('school_id')
            ->orderBy('id')
            ->get(['id', 'school_id']);

        $rolesCount = $roleIds->count();

        foreach ($users as $index => $user) {
            UserSchoolRole::query()->withTrashed()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'school_id' => $user->school_id,
                ],
                [
                    'role_id' => $roleIds[$index % $rolesCount],
                    'deleted_at' => null,
                ],
            );
        }
    }
}
