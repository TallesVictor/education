<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use App\Models\UserSchoolRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EnrollmentBulkTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_enrollment_processes_multiple_students(): void
    {
        Sanctum::actingAs($this->makeAdminUser());

        $school = School::query()->create([
            'name' => 'Escola Lote',
            'type' => 'private',
        ]);

        $class = SchoolClass::query()->create([
            'school_id' => $school->id,
            'name' => 'Turma A',
            'year' => 2026,
        ]);

        $subject = Subject::query()->create([
            'school_id' => $school->id,
            'name' => 'Matemática',
        ]);

        $studentA = User::query()->create([
            'school_id' => $school->id,
            'name' => 'Aluno A',
            'email' => 'aluno.a@test.local',
            'password' => 'secret123',
        ]);

        $studentB = User::query()->create([
            'school_id' => $school->id,
            'name' => 'Aluno B',
            'email' => 'aluno.b@test.local',
            'password' => 'secret123',
        ]);

        $response = $this->postJson('/api/enrollments/bulk', [
            'class_external_id' => $class->external_id,
            'subject_external_id' => $subject->external_id,
            'student_external_ids' => [$studentA->external_id, $studentB->external_id],
            'start_date' => '2026-02-01',
            'end_date' => '2026-12-15',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.processed', 2);

        $this->assertDatabaseCount('enrollments', 2);
    }

    private function makeAdminUser(): User
    {
        $role = Role::query()->create([
            'name' => 'Admin',
            'is_system' => true,
        ]);

        $user = User::query()->create([
            'name' => 'Admin Teste',
            'email' => 'admin-enrollment@test.local',
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
