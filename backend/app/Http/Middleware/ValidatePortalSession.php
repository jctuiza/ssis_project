<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiError;
use App\Support\Rules;
use Closure;
use Illuminate\Http\Request;

class ValidatePortalSession
{
    public function handle(Request $request, Closure $next)
    {
        $u = $request->user();
        if (! $u || $u->status !== 'Active') {
            $u?->tokens()->delete();
            throw new ApiError('Your account is disabled or your session has ended.', 401);
        }
        if (Rules::settings()->maintenance_mode && $u->role->key !== 'admin' && ! $request->is('api/logout')) {
            throw new ApiError('The system is under maintenance.', 503);
        }
        if ($u->must_change_password && ! in_array($request->path(), ['api/me', 'api/logout', 'api/account/password'], true)) {
            throw new ApiError('Change your temporary password before using the portal.', 403);
        }
        $response = $next($request);
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
