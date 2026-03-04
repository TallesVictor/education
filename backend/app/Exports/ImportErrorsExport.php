<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ImportErrorsExport implements FromCollection, WithHeadings
{
    /**
     * @param  array<int, array{line:int, message:string, email?:string|null, cpf?:string|null}>  $errors
     */
    public function __construct(private readonly array $errors) {}

    public function collection(): Collection
    {
        return collect($this->errors)->map(function (array $error) {
            return [
                'line' => $error['line'],
                'email' => $error['email'] ?? null,
                'cpf' => $error['cpf'] ?? null,
                'message' => $error['message'],
            ];
        });
    }

    public function headings(): array
    {
        return [
            'linha',
            'email',
            'cpf',
            'erro',
        ];
    }
}
