<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiError;
use Closure;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Symfony\Component\HttpFoundation\Response;

class AuthenticatePortalCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        $cookie = $request->cookie('ssis_auth');
        if ($cookie || $request->header('X-SSIS-Request') === '1') {
            if (! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
                $origin = $request->header('Origin');
                $allowed = config('cors.allowed_origins', []);
                $allowed[] = $request->getSchemeAndHttpHost();
                if ($request->header('X-SSIS-Request') !== '1' || ! $origin || ! in_array($origin, $allowed, true)) {
                    throw new ApiError('The request origin could not be verified.', 403);
                }
            }
        }
        if ($cookie) {
            try {
                $request->headers->set('Authorization', 'Bearer '.Crypt::decryptString($cookie));
            } catch (DecryptException) {
                return response()->json(['message' => 'Your session has ended. Please log in again.'], 401)
                    ->withoutCookie('ssis_auth', '/api', config('portal.cookie_domain'));
            }
        }

        return $next($request);
    }
}
