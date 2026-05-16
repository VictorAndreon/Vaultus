<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureIdempotent
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (! $key || ! $request->user()) {
            return $next($request);
        }

        $endpoint = $request->method() . ' ' . $request->path();
        $userId   = $request->user()->id;

        $cached = DB::table('idempotency_keys')
            ->where(['user_id' => $userId, 'endpoint' => $endpoint, 'key' => $key])
            ->first();

        if ($cached) {
            return $this->buildReplay($cached->response_status, $cached->response_body);
        }

        $response = $next($request);

        // Cacheia 2xx e 3xx (Inertia/Laravel retornam 302 redirect em writes; idempotência cobre ambos).
        // 4xx fica de fora pois o cliente pode corrigir; 5xx fica de fora por serem transitórios.
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 400) {
            try {
                DB::table('idempotency_keys')->insert([
                    'user_id'         => $userId,
                    'key'             => $key,
                    'endpoint'        => $endpoint,
                    'response_status' => $response->getStatusCode(),
                    'response_body'   => $response->getContent(),
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            } catch (\Illuminate\Database\UniqueConstraintViolationException) {
                // Race: outra requisição concorrente gravou a chave entre o SELECT inicial e este INSERT.
                // Devolve o que o vencedor persistiu para garantir mesma resposta em todas as réplicas.
                $cached = DB::table('idempotency_keys')
                    ->where(['user_id' => $userId, 'endpoint' => $endpoint, 'key' => $key])
                    ->first();
                if ($cached) {
                    return $this->buildReplay($cached->response_status, $cached->response_body);
                }
            }
        }

        return $response;
    }

    /**
     * Reconstrói o response cacheado. Para 3xx, preferimos back() em vez de tentar
     * recriar Location: o cliente Inertia recupera o destino via session flash, o que
     * mantém o efeito do redirect mesmo sem a header original armazenada.
     */
    private function buildReplay(int $status, string $body): Response
    {
        if ($status >= 300 && $status < 400) {
            return back()->setStatusCode($status)->header('X-Idempotent-Replay', 'true');
        }

        return response($body, $status)
            ->header('Content-Type', 'application/json')
            ->header('X-Idempotent-Replay', 'true');
    }
}
