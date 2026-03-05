<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    private const USERS_PER_SCHOOL = 20;

    public function run(): void
    {
        $schoolIds = School::query()
            ->orderBy('id')
            ->pluck('id')
            ->values();

        if ($schoolIds->isEmpty()) {
            return;
        }

        $password = Hash::make('password123');
        $globalIndex = 1;

        foreach ($schoolIds as $schoolId) {
            for ($studentIndex = 1; $studentIndex <= self::USERS_PER_SCHOOL; $studentIndex++) {
                $cpfNumber = 10_000_000_000 + $globalIndex;

                User::query()->withTrashed()->updateOrCreate(
                    ['email' => sprintf('usuario.%05d@example.com', $globalIndex)],
                    [
                        'school_id' => $schoolId,
                        'name' => sprintf('Usuário %05d', $globalIndex),
                        'social_name' => sprintf('Aluno %05d', $globalIndex),
                        'password' => $password,
                        'cpf' => $this->formatCpf($cpfNumber),
                        'phone' => sprintf('+55 11 9%08d', $globalIndex),
                        'deleted_at' => null,
                    ],
                );

                $globalIndex++;
            }
        }
    }

    private function formatCpf(int $number): string
    {
        $digits = str_pad((string) $number, 11, '0', STR_PAD_LEFT);

        return sprintf(
            '%s.%s.%s-%s',
            substr($digits, 0, 3),
            substr($digits, 3, 3),
            substr($digits, 6, 3),
            substr($digits, 9, 2),
        );
    }
}
