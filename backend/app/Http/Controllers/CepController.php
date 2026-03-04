<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class CepController extends Controller
{
    public function show(string $cep): JsonResponse
    {
        $normalizedCep = preg_replace('/\D/', '', $cep) ?? '';

        abort_if(strlen($normalizedCep) !== 8, 422, 'CEP inválido.');

        $response = Http::timeout(5)->get("https://viacep.com.br/ws/{$normalizedCep}/json/");

        if (!$response->ok()) {
            abort(502, 'Falha ao consultar ViaCEP.');
        }

        $body = $response->json();

        if (($body['erro'] ?? false) === true) {
            abort(404, 'CEP não encontrado.');
        }

        return response()->json([
            'data' => $body,
        ]);
    }
}
