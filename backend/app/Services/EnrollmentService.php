<?php

namespace App\Services;

use App\Models\Enrollment;

class EnrollmentService
{
    public function enroll(
        int $schoolId,
        int $userId,
        int $classId,
        int $subjectId,
        ?string $startDate = null,
        ?string $endDate = null,
    ): Enrollment {
        $enrollment = Enrollment::query()
            ->withTrashed()
            ->where('school_id', $schoolId)
            ->where('user_id', $userId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->first();

        if ($enrollment) {
            $enrollment->restore();
            $enrollment->update([
                'school_id' => $schoolId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);

            return $enrollment;
        }

        return Enrollment::query()->create([
            'school_id' => $schoolId,
            'user_id' => $userId,
            'class_id' => $classId,
            'subject_id' => $subjectId,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);
    }

    public function bulkEnroll(
        int $schoolId,
        array $studentIds,
        int $classId,
        int $subjectId,
        ?string $startDate = null,
        ?string $endDate = null,
    ): int
    {
        $count = 0;

        foreach ($studentIds as $studentId) {
            $this->enroll(
                schoolId: $schoolId,
                userId: $studentId,
                classId: $classId,
                subjectId: $subjectId,
                startDate: $startDate,
                endDate: $endDate,
            );
            $count++;
        }

        return $count;
    }
}
