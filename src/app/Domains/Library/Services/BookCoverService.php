<?php

namespace App\Domains\Library\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookCoverService
{
    private const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    private const MAX_EDGE  = 600;             // lado maior em px
    private const DISK      = 'public';

    public function fromUpload(UploadedFile $file, int $userId): string
    {
        $binary = file_get_contents($file->getRealPath());

        if ($binary === false) {
            throw ValidationException::withMessages([
                'cover_file' => 'Não foi possível ler o arquivo enviado.',
            ]);
        }

        return $this->processAndStore($binary, $userId, 'cover_file');
    }

    public function fromUrl(string $url, int $userId): string
    {
        $binary = $this->downloadSafely($url);

        return $this->processAndStore($binary, $userId, 'cover_url');
    }

    private function downloadSafely(string $url): string
    {
        $parts  = parse_url($url);
        $scheme = strtolower($parts['scheme'] ?? '');

        if (! in_array($scheme, ['http', 'https'], true) || empty($parts['host'])) {
            throw ValidationException::withMessages([
                'cover_url' => 'A URL da capa deve começar com http:// ou https://.',
            ]);
        }

        $this->assertPublicHost($parts['host']);

        try {
            $response = Http::connectTimeout(5)
                ->timeout(10)
                ->withOptions(['allow_redirects' => false]) // redirect p/ host interno burlaria o guard
                ->get($url);
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'cover_url' => 'Não foi possível baixar a imagem dessa URL.',
            ]);
        }

        if (! $response->successful()) {
            throw ValidationException::withMessages([
                'cover_url' => 'Não foi possível baixar a imagem dessa URL.',
            ]);
        }

        if ((int) $response->header('Content-Length') > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'cover_url' => 'A imagem excede o limite de 5 MB.',
            ]);
        }

        $body = $response->body();

        if ($body === '' || strlen($body) > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'cover_url' => 'A imagem está vazia ou excede o limite de 5 MB.',
            ]);
        }

        return $body;
    }

    private function assertPublicHost(string $host): void
    {
        // parse_url preserva os colchetes em literais IPv6 (ex.: "[::1]") — remove antes de validar.
        $stripped = preg_replace('/^\[(.+)\]$/', '$1', $host);

        if (filter_var($stripped, FILTER_VALIDATE_IP)) {
            $ips = [$stripped];
        } else {
            // Resolve A (IPv4) e AAAA (IPv6): o cliente HTTP pode conectar por qualquer
            // família, então ambas precisam ser validadas (gethostbynamel só veria IPv4).
            $ips = array_values(array_filter(array_map(
                fn ($r) => $r['ip'] ?? $r['ipv6'] ?? null,
                dns_get_record($stripped, DNS_A + DNS_AAAA) ?: []
            )));
        }

        if (empty($ips)) {
            throw ValidationException::withMessages([
                'cover_url' => 'Não foi possível resolver o endereço da imagem.',
            ]);
        }

        foreach ($ips as $ip) {
            if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                throw ValidationException::withMessages([
                    'cover_url' => 'Essa URL aponta para um endereço não permitido.',
                ]);
            }
        }
    }

    public function delete(?string $path): void
    {
        if ($path && Storage::disk(self::DISK)->exists($path)) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    private function processAndStore(string $binary, int $userId, string $field): string
    {
        // Guard único de tamanho — protege tanto o upload quanto o download por URL (fromUrl).
        if (strlen($binary) > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                $field => 'A imagem deve ter no máximo 5 MB.',
            ]);
        }

        $image = @imagecreatefromstring($binary);

        if ($image === false) {
            throw ValidationException::withMessages([
                $field => 'O arquivo não é uma imagem válida.',
            ]);
        }

        $width  = imagesx($image);
        $height = imagesy($image);
        $scale  = min(1, self::MAX_EDGE / max($width, $height));
        $newW   = max(1, (int) round($width * $scale));
        $newH   = max(1, (int) round($height * $scale));

        $resized = imagecreatetruecolor($newW, $newH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $width, $height);

        ob_start();
        imagewebp($resized, null, 80);
        $webp = (string) ob_get_clean();

        imagedestroy($image);
        imagedestroy($resized);

        $path = sprintf('covers/%d/%s.webp', $userId, Str::uuid());
        Storage::disk(self::DISK)->put($path, $webp);

        return $path;
    }
}
