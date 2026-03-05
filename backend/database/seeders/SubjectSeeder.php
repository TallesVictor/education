<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\Subject;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    private const TARGET_COUNT = 100;

    public function run(): void
    {
        $schoolIds = School::query()
            ->orderBy('id')
            ->pluck('id')
            ->values();

        if ($schoolIds->isEmpty()) {
            return;
        }

        $schoolCount = $schoolIds->count();

        for ($index = 1; $index <= self::TARGET_COUNT; $index++) {
            $schoolId = $schoolIds[($index - 1) % $schoolCount];

            $subject = Subject::query()->withTrashed()->updateOrCreate(
                [
                    'school_id' => $schoolId,
                    'name' => sprintf('Disciplina %03d', $index),
                ],
                [
                    'description' => sprintf('Conteúdo programático da disciplina %03d.', $index),
                    'image_path' => null,
                    'deleted_at' => null,
                ],
            );

            $subject->schools()->syncWithoutDetaching([$schoolId]);
        }
    }
}
