<?php

use App\Console\Commands\InstallSsis;
use App\Exceptions\ApiError;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Middleware\HandleCors;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([InstallSsis::class])
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind Render's / Vercel's proxy the real client IP (used by the login rate limiter) is in X-Forwarded-For.
        $middleware->prepend(HandleCors::class);

        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Expected API errors (validation, permissions) are answered to the user, not written to the error log.
        $exceptions->dontReport(ApiError::class);
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
