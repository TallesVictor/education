<?php

namespace Database\Seeders;

use App\Models\Enrollment;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

class EnrollmentSeeder extends Seeder
{
    private const MIN_STUDENTS_PER_CLASS = 20;

    public function run(): void
    {
        $classes = SchoolClass::query()
            ->orderBy('id')
            ->get(['id', 'school_id']);

        $subjectsBySchool = Subject::query()
            ->orderBy('id')
            ->get(['id', 'school_id'])
            ->groupBy('school_id');

        $usersBySchool = User::query()
            ->where('email', 'like', 'usuario.%@example.com')
            ->whereNotNull('school_id')
            ->orderBy('id')
            ->get(['id', 'school_id'])
            ->groupBy('school_id');

        foreach ($classes as $classIndex => $class) {
            $subjects = $this->groupBySchool($subjectsBySchool, $class->school_id);
            $users = $this->groupBySchool($usersBySchool, $class->school_id);

            if ($subjects->isEmpty() || $users->isEmpty()) {
                continue;
            }

            $subject = $subjects[$classIndex % $subjects->count()];
            $studentsToAssign = min(self::MIN_STUDENTS_PER_CLASS, $users->count());

            for ($offset = 0; $offset < $studentsToAssign; $offset++) {
                $user = $users[($classIndex + $offset) % $users->count()];
                $startDate = now()->subDays(($classIndex + $offset) % 60)->toDateString();
                $endDate = (($classIndex + $offset) % 5) === 0 ? now()->addMonths(4)->toDateString() : null;

                Enrollment::query()->withTrashed()->updateOrCreate(
                    [
                        'school_id' => $class->school_id,
                        'user_id' => $user->id,
                        'class_id' => $class->id,
                        'subject_id' => $subject->id,
                    ],
                    [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'deleted_at' => null,
                    ],
                );
            }
        }
    }

    private function groupBySchool(Collection $itemsBySchool, ?int $schoolId): Collection
    {
        if (!$schoolId) {
            return collect();
        }

        return $itemsBySchool->get($schoolId, collect())->values();
    }
}
