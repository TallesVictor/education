<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\UserSchoolRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PermissionCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_crud_permissions(): void
    {
        Sanctum::actingAs($this->makeAdminUser());

        $createResponse = $this->postJson('/api/permissions', [
            'name' => 'Gerenciar Boletins',
            'key' => 'grades.manage',
            'module' => 'grades',
        ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.key', 'grades.manage');

        $externalId = $createResponse->json('data.external_id');

        $this->putJson("/api/permissions/{$externalId}", [
            'name' => 'Gerenciar Boletins e Notas',
            'key' => 'grades.manage',
            'module' => 'grades',
        ])->assertOk()->assertJsonPath('data.name', 'Gerenciar Boletins e Notas');

        $this->deleteJson("/api/permissions/{$externalId}")
            ->assertOk()
            ->assertJsonPath('data.message', 'Permissão removida com sucesso.');

        $this->assertSoftDeleted('permissions', [
            'external_id' => $externalId,
        ]);
    }

    private function makeAdminUser(): User
    {
        $role = Role::query()->create([
            'name' => 'Admin',
            'is_system' => true,
        ]);

        $user = User::query()->create([
            'name' => 'Admin Teste',
            'email' => 'admin@test.local',
            'password' => 'secret123',
        ]);

        UserSchoolRole::query()->create([
            'user_id' => $user->id,
            'school_id' => null,
            'role_id' => $role->id,
        ]);

        return $user;
    }
}
