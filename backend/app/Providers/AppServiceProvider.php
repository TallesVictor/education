<?php

namespace App\Providers;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

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
        JsonResource::withoutWrapping();

        RateLimiter::for('auth-login', function (Request $request) {
            $identifier = sprintf(
                '%s|%s',
                (string) $request->ip(),
                strtolower((string) $request->input('email', '')),
            );

            return Limit::perMinute(5)->by($identifier);
        });

        RateLimiter::for('auth-password-reset', function (Request $request) {
            $identifier = sprintf(
                '%s|%s',
                (string) $request->ip(),
                strtolower((string) $request->input('email', '')),
            );

            return Limit::perMinute(3)->by($identifier);
        });
    }
}
