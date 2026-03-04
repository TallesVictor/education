<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\SchoolClass;
use Illuminate\Database\Seeder;

class SchoolClassSeeder extends Seeder
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

            SchoolClass::query()->withTrashed()->updateOrCreate(
                [
                    'school_id' => $schoolId,
                    'name' => sprintf('Turma %03d', $index),
                ],
                [
                    'year' => 2023 + (($index - 1) % 4),
                    'deleted_at' => null,
                ],
            );
        }
    }
}
