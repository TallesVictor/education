<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Models\UserSchoolRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserImportFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_import_supports_preview_confirm_and_error_report(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->makeAdminUser());

        $school = School::query()->create([
            'name' => 'Escola Teste',
            'type' => 'private',
        ]);

        $role = Role::query()->create([
            'name' => 'Aluno',
            'is_system' => true,
        ]);

        User::query()->create([
            'school_id' => $school->id,
            'name' => 'Aluno Existente',
            'email' => 'existente@teste.local',
            'password' => 'secret123',
            'social_name' => 'Velho Nome',
        ]);

        $csv = implode("\n", [
            'nome,email,senha,nome_social,cpf,telefone',
            'Aluno Atualizado,existente@teste.local,senha123,Nome Novo,123.456.789-00,(11) 90000-0001',
            'Aluno Novo,novo@teste.local,senha123,Aluno Novo,987.654.321-00,(11) 90000-0002',
            'Sem Email,,,Sem Nome,,',
        ]);

        $previewFile = UploadedFile::fake()->createWithContent('usuarios.csv', $csv);

        $previewResponse = $this->postJson('/api/users/import', [
            'file' => $previewFile,
            'role_external_id' => $role->external_id,
            'school_external_id' => $school->external_id,
            'preview' => true,
        ]);

        $previewResponse
            ->assertOk()
            ->assertJsonPath('data.inserted', 1)
            ->assertJsonPath('data.updated', 1)
            ->assertJsonPath('data.errors_count', 1);

        $confirmFile = UploadedFile::fake()->createWithContent('usuarios.csv', $csv);

        $confirmResponse = $this->postJson('/api/users/import', [
            'file' => $confirmFile,
            'role_external_id' => $role->external_id,
            'school_external_id' => $school->external_id,
        ]);

        $confirmResponse
            ->assertOk()
            ->assertJsonPath('data.inserted', 1)
            ->assertJsonPath('data.updated', 1)
            ->assertJsonPath('data.errors_count', 1);

        $errorReportUrl = $confirmResponse->json('data.error_report_url');

        $this->assertNotNull($errorReportUrl);

        $relativePath = str_replace('/storage/', '', (string) $errorReportUrl);
        $this->assertTrue(Storage::disk('public')->exists($relativePath));

        $this->assertDatabaseHas('users', [
            'email' => 'existente@teste.local',
            'social_name' => 'Nome Novo',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'novo@teste.local',
            'school_id' => $school->id,
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
            'email' => 'admin-import@test.local',
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
