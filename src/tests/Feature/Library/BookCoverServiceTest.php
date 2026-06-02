<?php

namespace Tests\Feature\Library;

use App\Domains\Library\Services\BookCoverService;
use Illuminate\Http\UploadedFile;
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
}
