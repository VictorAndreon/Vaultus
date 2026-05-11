<?php

namespace Tests\Unit\Shared;

use App\Shared\Casts\EncryptedCast;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class EncryptedCastTest extends TestCase
{
    private EncryptedCast $cast;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cast = new EncryptedCast();
    }

    public function test_encrypts_value_on_set(): void
    {
        $result = $this->cast->set(null, 'content', 'hello world', []);

        $this->assertNotEquals('hello world', $result);
        $this->assertEquals('hello world', Crypt::decryptString($result));
    }

    public function test_decrypts_value_on_get(): void
    {
        $encrypted = Crypt::encryptString('secret data');

        $result = $this->cast->get(null, 'content', $encrypted, []);

        $this->assertEquals('secret data', $result);
    }

    public function test_returns_null_when_value_is_null_on_set(): void
    {
        $this->assertNull($this->cast->set(null, 'content', null, []));
    }

    public function test_returns_null_when_value_is_null_on_get(): void
    {
        $this->assertNull($this->cast->get(null, 'content', null, []));
    }

    public function test_returns_null_and_logs_on_invalid_encrypted_value(): void
    {
        $result = $this->cast->get(null, 'content', 'not-encrypted-data', []);

        $this->assertNull($result);
    }
}
