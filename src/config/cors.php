<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => [env('CORS_ALLOWED_ORIGINS', 'https://vaultus.local')],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Inertia', 'X-Inertia-Version'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
