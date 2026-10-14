<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Mail::extend('brevo', function (array $config = []) {
            return (new BrevoTransportFactory)->create(
                new Dsn('brevo+api', 'default', config('services.brevo.key'))
            );
        });

        // Brute-force protection: 5 login attempts per minute for each username + IP address.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)->by(strtolower(trim((string) $request->input('identifier'))).'|'.$request->ip()));

        // General API limit per signed-in user (or per IP address for anonymous calls).
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(240)->by($request->user()?->getAuthIdentifier() ?: $request->ip()));
    }
}
