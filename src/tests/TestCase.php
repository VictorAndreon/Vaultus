<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        // Tripwire pré-boot: confirma que a conexão de teste resolveria para um
        // banco "_test" ANTES de qualquer migrate:fresh do RefreshDatabase. Lê
        // $_SERVER primeiro, na mesma ordem do Dotenv do Laravel. Última linha de
        // defesa caso o bootstrap de testes seja contornado/editado.
        $db = (string) ($_SERVER['DB_DATABASE'] ?? $_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: '');
        if (! str_ends_with($db, '_test')) {
            throw new \RuntimeException(
                "[ABORTADO] A suíte resolveria para o banco '{$db}', que não é de teste. " .
                'Recusando para evitar perda de dados — verifique tests/bootstrap.php.'
            );
        }

        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }
}
