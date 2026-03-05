<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\User;
use App\Models\UserSchoolRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ForumModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_topic_and_discussion_thread_until_third_level(): void
    {
        Sanctum::actingAs($this->makeAdminUser());

        $school = School::query()->create([
            'name' => 'Escola Fórum',
            'type' => 'private',
        ]);

        $class = SchoolClass::query()->create([
            'school_id' => $school->id,
            'name' => 'Turma Fórum',
            'year' => 2026,
        ]);

        $topicResponse = $this->postJson('/api/forums/topics', [
            'scope' => 'class',
            'class_external_id' => $class->external_id,
            'title' => 'Tema de Avaliação',
            'description' => 'Discussão sobre a próxima avaliação.',
            'tags' => ['avaliacao', 'turma'],
            'is_pinned' => true,
        ]);

        $topicResponse
            ->assertCreated()
            ->assertJsonPath('data.scope', 'class')
            ->assertJsonPath('data.class_external_id', $class->external_id);

        $topicExternalId = $topicResponse->json('data.external_id');

        $levelOne = $this->postJson("/api/forums/topics/{$topicExternalId}/discussions", [
            'content' => 'Mensagem inicial.',
        ])->assertCreated();

        $levelOneExternalId = $levelOne->json('data.external_id');

        $levelTwo = $this->postJson("/api/forums/topics/{$topicExternalId}/discussions", [
            'parent_external_id' => $levelOneExternalId,
            'content' => 'Resposta de nível 2.',
        ])->assertCreated();

        $levelTwoExternalId = $levelTwo->json('data.external_id');

        $levelThree = $this->postJson("/api/forums/topics/{$topicExternalId}/discussions", [
            'parent_external_id' => $levelTwoExternalId,
            'content' => 'Resposta de nível 3.',
        ]);

        $levelThree
            ->assertCreated()
            ->assertJsonPath('data.depth', 3);

        $levelThreeExternalId = $levelThree->json('data.external_id');

        $this->postJson("/api/forums/topics/{$topicExternalId}/discussions", [
            'parent_external_id' => $levelThreeExternalId,
            'content' => 'Resposta de nível 4.',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'A discussão permite no máximo 3 níveis de resposta.');
    }

    private function makeAdminUser(): User
    {
        $role = Role::query()->create([
            'name' => 'Admin',
            'is_system' => true,
        ]);

        $user = User::query()->create([
            'name' => 'Admin Fórum',
            'email' => 'admin-forum@test.local',
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
