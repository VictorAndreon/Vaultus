<?php

/*
 * Bootstrap da suíte de testes.
 *
 * Por que este arquivo existe: o PHPUnit aplica <env force="true"> em $_ENV e via
 * putenv(), mas NÃO em $_SERVER. O Laravel resolve env() lendo $_SERVER primeiro
 * (ServerConstAdapter tem prioridade sobre $_ENV/putenv). Como o Docker injeta
 * DB_DATABASE=vaultus (o banco REAL) como variável de ambiente — presente em
 * $_SERVER — o override do phpunit.xml era inócuo e a suíte rodava, e apagava via
 * RefreshDatabase, o banco com os dados do usuário.
 *
 * Aqui forçamos o banco de TESTE em TODAS as fontes que o Dotenv consulta, antes
 * de qualquer boot do Laravel, garantindo que config('database') resolva no banco
 * isolado de testes.
 */

require __DIR__ . '/../vendor/autoload.php';

$testEnv = [
    'APP_ENV'       => 'testing',
    'DB_CONNECTION' => 'pgsql',
    'DB_HOST'       => 'db',
    'DB_PORT'       => '5432',
    'DB_DATABASE'   => 'vaultus_test',
    'DB_USERNAME'   => 'vaultus',
    'DB_PASSWORD'   => 'secret',
];

// Trava de segurança: o banco de teste DEVE terminar em "_test". Impede que uma
// edição futura aponte a suíte para um banco com dados reais.
if (! str_ends_with($testEnv['DB_DATABASE'], '_test')) {
    fwrite(STDERR, "\n[ABORTADO] DB_DATABASE de teste ('{$testEnv['DB_DATABASE']}') não termina em '_test'. Recusando para evitar perda de dados.\n");
    exit(1);
}

foreach ($testEnv as $key => $value) {
    $_SERVER[$key] = $value;
    $_ENV[$key]    = $value;
    putenv("{$key}={$value}");
}
