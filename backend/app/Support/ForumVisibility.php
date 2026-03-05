<?php

namespace App\Support;

use App\Models\Enrollment;
use App\Models\ForumTopic;
use App\Models\UserSchoolRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ForumVisibility
{
    public function applyTopicVisibilityScope(Builder $query, Request $request): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Não autenticado.');
        }

        $tenantId = app()->bound('tenant') ? (int) app('tenant') : null;

        if ($user->isAdmin()) {
            if (!$tenantId) {
                return;
            }

            $query->where(function (Builder $scopeQuery) use ($tenantId): void {
                $scopeQuery
                    ->where('scope', 'global')
                    ->orWhere('school_id', $tenantId);
            });

            return;
        }

        if (!$tenantId) {
            abort(403, 'Contexto da escola não encontrado.');
        }

        if (!$this->isStudent($request, $tenantId)) {
            $query->where(function (Builder $scopeQuery) use ($tenantId): void {
                $scopeQuery
                    ->where('scope', 'global')
                    ->orWhere('school_id', $tenantId);
            });

            return;
        }

        $studentClassIds = $this->studentClassIds((int) $user->id, $tenantId);

        $query->where(function (Builder $scopeQuery) use ($tenantId, $studentClassIds): void {
            $scopeQuery
                ->where('scope', 'global')
                ->orWhere(function (Builder $schoolScopeQuery) use ($tenantId): void {
                    $schoolScopeQuery
                        ->where('school_id', $tenantId)
                        ->where('scope', '!=', 'class');
                })
                ->orWhere(function (Builder $classScopeQuery) use ($tenantId, $studentClassIds): void {
                    $classScopeQuery
                        ->where('school_id', $tenantId)
                        ->where('scope', 'class');

                    if (empty($studentClassIds)) {
                        $classScopeQuery->whereRaw('1 = 0');

                        return;
                    }

                    $classScopeQuery->whereIn('class_id', $studentClassIds);
                });
        });
    }

    public function assertUserCanViewTopic(ForumTopic $topic, Request $request): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Não autenticado.');
        }

        if ($user->isAdmin()) {
            $tenantId = app()->bound('tenant') ? (int) app('tenant') : null;

            if (!$tenantId) {
                return;
            }

            if ($topic->scope === 'global') {
                return;
            }

            abort_unless((int) $topic->school_id === $tenantId, 404, 'Tópico não encontrado.');

            return;
        }

        $tenantId = app()->bound('tenant') ? (int) app('tenant') : (int) $user->school_id;
        abort_unless($tenantId, 403, 'Contexto da escola não encontrado.');

        if ($topic->scope === 'global') {
            return;
        }

        abort_unless((int) $topic->school_id === $tenantId, 404, 'Tópico não encontrado.');

        if ($topic->scope !== 'class') {
            return;
        }

        if (!$this->isStudent($request, $tenantId)) {
            return;
        }

        $studentClassIds = $this->studentClassIds((int) $user->id, $tenantId);
        abort_unless(in_array((int) $topic->class_id, $studentClassIds, true), 404, 'Tópico não encontrado.');
    }

    public function isStudent(Request $request, ?int $tenantId = null): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        $effectiveTenantId = $tenantId ?: (app()->bound('tenant') ? (int) app('tenant') : (int) $user->school_id);
        if (!$effectiveTenantId) {
            return false;
        }

        return UserSchoolRole::query()
            ->where('user_id', $user->id)
            ->where('school_id', $effectiveTenantId)
            ->whereHas('role', fn ($query) => $query->where('name', 'Aluno'))
            ->exists();
    }

    /**
     * @return list<int>
     */
    private function studentClassIds(int $userId, int $tenantId): array
    {
        return Enrollment::query()
            ->where('user_id', $userId)
            ->where('school_id', $tenantId)
            ->pluck('class_id')
            ->filter(fn ($classId) => !empty($classId))
            ->map(fn ($classId) => (int) $classId)
            ->values()
            ->all();
    }
}
