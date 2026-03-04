<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSchoolRequest;
use App\Http\Requests\UpdateSchoolRequest;
use App\Http\Resources\SchoolResource;
use App\Models\School;
use App\Support\TenantCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class SchoolController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $schools = School::query()
            ->when($request->string('name')->isNotEmpty(), function ($query) use ($request) {
                $query->where('name', 'like', '%'.$request->string('name').'%');
            })
            ->when($request->string('type')->isNotEmpty(), function ($query) use ($request) {
                $query->where('type', $request->string('type'));
            })
            ->when($request->string('city')->isNotEmpty(), function ($query) use ($request) {
                $query->where('city', 'like', '%'.$request->string('city').'%');
            })
            ->orderBy('name')
            ->paginate((int) $request->input('per_page', 15));

        return response()->json([
            'data' => SchoolResource::collection($schools->items()),
            'meta' => [
                'current_page' => $schools->currentPage(),
                'last_page' => $schools->lastPage(),
                'per_page' => $schools->perPage(),
                'total' => $schools->total(),
            ],
        ]);
    }

    public function store(StoreSchoolRequest $request): JsonResponse
    {
        $school = School::query()->create($request->validated());

        TenantCache::flushSettingsCache($school->id);

        return response()->json([
            'data' => new SchoolResource($school),
        ], 201);
    }

    public function show(string $externalId): JsonResponse
    {
        $schoolId = School::query()->where('external_id', $externalId)->value('id');
        abort_unless($schoolId, 404);

        $school = Cache::remember(
            TenantCache::settingsKey((int) $schoolId),
            TenantCache::SETTINGS_TTL,
            fn () => School::query()->findOrFail($schoolId),
        );

        return response()->json([
            'data' => new SchoolResource($school),
        ]);
    }

    public function update(UpdateSchoolRequest $request, string $externalId): JsonResponse
    {
        $school = School::query()->where('external_id', $externalId)->firstOrFail();

        if ($request->filled('cnpj')) {
            $exists = School::query()
                ->where('cnpj', $request->string('cnpj'))
                ->where('id', '!=', $school->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'cnpj' => ['CNPJ já está em uso.'],
                ]);
            }
        }

        $school->update($request->validated());

        TenantCache::flushSettingsCache($school->id);

        return response()->json([
            'data' => new SchoolResource($school),
        ]);
    }

    public function destroy(string $externalId): JsonResponse
    {
        $school = School::query()->where('external_id', $externalId)->firstOrFail();
        $school->delete();

        TenantCache::flushSettingsCache($school->id);

        return response()->json([
            'data' => ['message' => 'Escola removida com sucesso.'],
        ]);
    }
}
