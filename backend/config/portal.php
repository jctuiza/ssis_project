<?php

return [
    'cookie_domain' => env('PORTAL_COOKIE_DOMAIN'),
    'cookie_same_site' => env('PORTAL_COOKIE_SAME_SITE', 'lax'),
    'cookie_secure' => env('PORTAL_COOKIE_SECURE', env('APP_ENV') === 'production'),
];
