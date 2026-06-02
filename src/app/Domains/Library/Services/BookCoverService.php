<?php

namespace App\Domains\Library\Services;

use Illuminate\Http\UploadedFile;
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
