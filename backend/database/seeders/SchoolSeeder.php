<?php

namespace Database\Seeders;

use App\Models\School;
use Illuminate\Database\Seeder;

class SchoolSeeder extends Seeder
{
    private const TARGET_COUNT = 100;

    public function run(): void
    {
        School::query()->firstOrCreate(
            ['cnpj' => '00.000.000/0001-91'],
            [
                'name' => 'Escola Modelo',
                'type' => 'private',
                'zip_code' => '01001-000',
                'street' => 'Praça da Sé',
                'neighborhood' => 'Sé',
                'city' => 'São Paulo',
                'state' => 'SP',
                'number' => '100',
            ],
        );

        $additionalCount = max(0, self::TARGET_COUNT - 1);
        $states = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'BA', 'CE', 'PE', 'GO'];

        for ($index = 1; $index <= $additionalCount; $index++) {
            $cnpjNumber = 10_000_000_000_000 + $index;

            School::query()->firstOrCreate(
                ['cnpj' => $this->formatCnpj($cnpjNumber)],
                [
                    'name' => sprintf('Escola %03d', $index),
                    'type' => $index % 2 === 0 ? 'public' : 'private',
                    'zip_code' => sprintf('01%03d-000', $index),
                    'street' => sprintf('Rua %03d', $index),
                    'neighborhood' => sprintf('Bairro %02d', (($index - 1) % 50) + 1),
                    'city' => sprintf('Cidade %02d', (($index - 1) % 30) + 1),
                    'state' => $states[($index - 1) % count($states)],
                    'number' => (string) (100 + $index),
                    'complement' => $index % 4 === 0 ? 'Bloco A' : null,
                ],
            );
        }
    }

    private function formatCnpj(int $number): string
    {
        $digits = str_pad((string) $number, 14, '0', STR_PAD_LEFT);

        return sprintf(
            '%s.%s.%s/%s-%s',
            substr($digits, 0, 2),
            substr($digits, 2, 3),
            substr($digits, 5, 3),
            substr($digits, 8, 4),
            substr($digits, 12, 2),
        );
    }
}
