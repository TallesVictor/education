<?php

namespace App\Services;

use App\Exports\ImportErrorsExport;
use App\Models\User;
use App\Models\UserSchoolRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class ImportService
{
    public function previewUsers(UploadedFile $file, ?int $schoolId, int $roleId): array
    {
        $this->prepareExcelTempPath();
        $rows = $this->readRows($file);

        if ($rows === []) {
            return [
                'inserted' => 0,
                'updated' => 0,
                'errors' => [],
                'preview_rows' => [],
            ];
        }

        return $this->processRows($rows, $schoolId, $roleId, true);
    }

    public function importUsers(UploadedFile $file, ?int $schoolId, int $roleId): array
    {
        $this->prepareExcelTempPath();
        $rows = $this->readRows($file);

        if ($rows === []) {
            return [
                'inserted' => 0,
                'updated' => 0,
                'errors' => [],
                'error_report_url' => null,
            ];
        }

        $result = $this->processRows($rows, $schoolId, $roleId, false);

        $result['error_report_url'] = count($result['errors']) > 0
            ? $this->generateErrorReport($result['errors'])
            : null;

        unset($result['preview_rows']);

        return $result;
    }

    /**
     * @param  array<int, array{line:int, mapped:array<string, mixed>}>  $rows
     */
    private function processRows(array $rows, ?int $schoolId, int $roleId, bool $previewOnly): array
    {
        $inserted = 0;
        $updated = 0;
        $errors = [];
        $previewRows = [];

        foreach ($rows as $row) {
            $line = $row['line'];
            $mapped = $row['mapped'];

            $name = $this->stringValue($mapped['nome'] ?? null);
            $email = strtolower($this->stringValue($mapped['email'] ?? null));
            $password = $this->stringValue($mapped['senha'] ?? null);
            $socialName = $this->stringValue($mapped['nome_social'] ?? null);
            $cpf = $this->stringValue($mapped['cpf'] ?? null);
            $phone = $this->stringValue($mapped['telefone'] ?? null);

            if (!$name || !$email) {
                $message = 'Campos obrigatórios ausentes: nome e email.';
                $errors[] = ['line' => $line, 'email' => $email, 'cpf' => $cpf, 'message' => $message];
                $previewRows[] = $this->previewLine($line, $name, $email, $cpf, 'invalid', $message);
                continue;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $message = 'E-mail inválido.';
                $errors[] = ['line' => $line, 'email' => $email, 'cpf' => $cpf, 'message' => $message];
                $previewRows[] = $this->previewLine($line, $name, $email, $cpf, 'invalid', $message);
                continue;
            }

            [$existing, $conflictMessage] = $this->findExistingUser($email, $cpf);

            if ($conflictMessage) {
                $errors[] = ['line' => $line, 'email' => $email, 'cpf' => $cpf, 'message' => $conflictMessage];
                $previewRows[] = $this->previewLine($line, $name, $email, $cpf, 'invalid', $conflictMessage);
                continue;
            }

            $action = $existing ? 'update' : 'insert';

            if ($previewOnly) {
                if ($action === 'insert') {
                    $inserted++;
                } else {
                    $updated++;
                }

                $previewRows[] = $this->previewLine($line, $name, $email, $cpf, $action, 'Pronto para confirmação.');
                continue;
            }

            try {
                if ($existing) {
                    if ($schoolId && $existing->school_id && $existing->school_id !== $schoolId) {
                        $message = 'Usuário já vinculado a outra escola (RN01).';
                        $errors[] = ['line' => $line, 'email' => $email, 'cpf' => $cpf, 'message' => $message];
                        $previewRows[] = $this->previewLine($line, $name, $email, $cpf, 'invalid', $message);
                        continue;
                    }

                    $payload = [
                        'name' => $name,
                        'social_name' => $socialName,
                        'email' => $email,
                        'cpf' => $cpf,
                        'phone' => $phone,
                    ];

                    if ($password) {
                        $payload['password'] = $password;
                    }

                    if ($schoolId && !$existing->school_id) {
                        $payload['school_id'] = $schoolId;
                    }

                    $existing->update($payload);
                    $user = $existing;
                    $updated++;
                } else {
                    $payload = [
                        'school_id' => $schoolId,
                        'name' => $name,
                        'social_name' => $socialName,
                        'email' => $email,
                        'cpf' => $cpf,
                        'phone' => $phone,
                        'password' => $password ?: Str::password(12),
                    ];

                    $user = User::query()->create($payload);
                    $inserted++;
                }

                $roleSchoolId = $schoolId ?: $user->school_id;

                if ($roleSchoolId) {
                    UserSchoolRole::query()
                        ->withTrashed()
                        ->updateOrCreate(
                            ['user_id' => $user->id, 'school_id' => $roleSchoolId],
                            ['role_id' => $roleId, 'deleted_at' => null],
                        );
                }
            } catch (\Throwable $exception) {
                $errors[] = [
                    'line' => $line,
                    'email' => $email,
                    'cpf' => $cpf,
                    'message' => 'Erro ao processar registro: '.$exception->getMessage(),
                ];
            }
        }

        return [
            'inserted' => $inserted,
            'updated' => $updated,
            'errors' => $errors,
            'preview_rows' => array_slice($previewRows, 0, 50),
        ];
    }

    /**
     * @return array{0:?User,1:?string}
     */
    private function findExistingUser(string $email, ?string $cpf): array
    {
        $byEmail = User::query()->where('email', $email)->first();
        $byCpf = $cpf ? User::query()->where('cpf', $cpf)->first() : null;

        if ($byEmail && $byCpf && $byEmail->id !== $byCpf->id) {
            return [null, 'Conflito: e-mail e CPF pertencem a usuários diferentes.'];
        }

        return [$byEmail ?: $byCpf, null];
    }

    /**
     * @return array<int, array{line:int, mapped:array<string, mixed>}>
     */
    private function readRows(UploadedFile $file): array
    {
        $sheet = collect(Excel::toArray([], $file)[0] ?? []);

        if ($sheet->isEmpty()) {
            return [];
        }

        $headers = collect($sheet->shift())
            ->map(fn ($value) => strtolower(trim((string) $value)))
            ->values();

        if ($headers->isEmpty()) {
            return [];
        }

        $rows = [];

        foreach ($sheet as $index => $row) {
            $values = collect($row)
                ->map(fn ($value) => is_string($value) ? trim($value) : $value)
                ->values()
                ->all();

            $values = array_pad($values, $headers->count(), null);
            $mapped = $headers->combine(array_slice($values, 0, $headers->count()))?->all() ?? [];

            $isBlank = collect($mapped)->every(fn ($value) => $value === null || $value === '');

            if ($isBlank) {
                continue;
            }

            $rows[] = [
                'line' => $index + 2,
                'mapped' => $mapped,
            ];
        }

        return $rows;
    }

    private function prepareExcelTempPath(): void
    {
        $temporaryPath = storage_path('framework/cache/laravel-excel');

        if (!File::exists($temporaryPath)) {
            File::ensureDirectoryExists($temporaryPath);
        }

        config(['excel.temporary_files.local_path' => $temporaryPath]);
    }

    /**
     * @param  array<int, array{line:int, message:string, email?:string|null, cpf?:string|null}>  $errors
     */
    private function generateErrorReport(array $errors): string
    {
        $filename = 'imports/import-errors-'.now()->format('YmdHis').'-'.Str::lower(Str::random(8)).'.xlsx';

        Excel::store(new ImportErrorsExport($errors), $filename, 'public');

        return Storage::disk('public')->url($filename);
    }

    /**
     * @return array{line:int,name:?string,email:?string,cpf:?string,action:string,message:string}
     */
    private function previewLine(int $line, ?string $name, ?string $email, ?string $cpf, string $action, string $message): array
    {
        return [
            'line' => $line,
            'name' => $name,
            'email' => $email,
            'cpf' => $cpf,
            'action' => $action,
            'message' => $message,
        ];
    }

    private function stringValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $parsed = trim((string) $value);

        return $parsed === '' ? null : $parsed;
    }
}
