<?php

namespace Tests\Feature\Library;

use App\Domains\Library\Services\BookCoverService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BookCoverServiceTest extends TestCase
{
    public function test_from_upload_stores_resized_webp(): void
    {
        Storage::fake('public');
        $service = new BookCoverService();

        // imagem fake 1200x1500 (precisa de GD, disponível no container)
        $file = UploadedFile::fake()->image('cover.jpg', 1200, 1500);

        $path = $service->fromUpload($file, 7);

        $this->assertStringStartsWith('covers/7/', $path);
        $this->assertStringEndsWith('.webp', $path);
        Storage::disk('public')->assertExists($path);

        $info = getimagesizefromstring(Storage::disk('public')->get($path));
        $this->assertNotFalse($info);
        $this->assertLessThanOrEqual(600, max($info[0], $info[1])); // lado maior ≤ 600
    }

    public function test_from_upload_rejects_non_image(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->create('not-image.txt', 10, 'text/plain');

        $this->expectException(ValidationException::class);
        (new BookCoverService())->fromUpload($file, 7);
    }

    private function pngBytes(int $w = 100, int $h = 120): string
    {
        $im = imagecreatetruecolor($w, $h);
        ob_start();
        imagepng($im);
        $bytes = (string) ob_get_clean();
        imagedestroy($im);

        return $bytes;
    }

    public function test_from_url_downloads_and_stores(): void
    {
        Storage::fake('public');
        Http::fake(['http://93.184.216.34/*' => Http::response($this->pngBytes(), 200, ['Content-Type' => 'image/png'])]);

        $path = (new BookCoverService())->fromUrl('http://93.184.216.34/cover.png', 7);

        Storage::disk('public')->assertExists($path);
        $this->assertStringEndsWith('.webp', $path);
    }

    public function test_from_url_rejects_non_image(): void
    {
        Storage::fake('public');
        Http::fake(['http://93.184.216.34/*' => Http::response('isto não é imagem', 200)]);

        $this->expectException(ValidationException::class);
        (new BookCoverService())->fromUrl('http://93.184.216.34/x.png', 7);
    }

    public function test_from_url_blocks_private_ip_ssrf(): void
    {
        $this->expectException(ValidationException::class);
        // 169.254.169.254 = endpoint de metadados em nuvens (alvo clássico de SSRF)
        (new BookCoverService())->fromUrl('http://169.254.169.254/latest/meta-data', 7);
    }

    public function test_from_url_blocks_ipv6_loopback_ssrf(): void
    {
        $this->expectException(ValidationException::class);
        // [::1] = loopback IPv6. gethostbynamel (só-IPv4) não o veria; dns_get_record(AAAA) sim.
        (new BookCoverService())->fromUrl('http://[::1]/latest/meta-data', 7);
    }

    public function test_from_url_rejects_oversize(): void
    {
        Http::fake(['http://93.184.216.34/*' => Http::response('x', 200, ['Content-Length' => (string) (6 * 1024 * 1024)])]);

        $this->expectException(ValidationException::class);
        (new BookCoverService())->fromUrl('http://93.184.216.34/big.png', 7);
    }

    public function test_from_url_rejects_oversize_body_without_content_length(): void
    {
        // Sem Content-Length confiável: o segundo guard (tamanho real do corpo) deve barrar.
        Http::fake(['http://93.184.216.34/*' => Http::response(str_repeat('x', 6 * 1024 * 1024), 200)]);

        $this->expectException(ValidationException::class);
        (new BookCoverService())->fromUrl('http://93.184.216.34/big.png', 7);
    }
}
