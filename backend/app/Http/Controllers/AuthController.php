<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\Role;
use App\Models\User;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class AuthController extends ApiController
{
    private const ROLES_KEY = 'ssis:public-roles';

    // GET /api/roles/public   (roles shown on the login pages)
    // Needed by every login page and almost never changes, so it is cached for 10 minutes.
    // The X-Cache response header says whether the answer came from the cache (HIT) or from the database (MISS).
    public function publicRoles()
    {
        $hit = Cache::has(self::ROLES_KEY);
        $roles = Cache::remember(
            self::ROLES_KEY,
            600,
            fn () => Role::orderBy('role_id')->get(['key', 'label'])->map(fn ($r) => ['key' => $r->key, 'label' => $r->label])->all(),
        );

        return response()->json($roles)->header('X-Cache', $hit ? 'HIT' : 'MISS');
    }

    // POST /api/login  { role, identifier, password }  ->  { user, roles, token }
    public function login(Request $request)
    {
        $data = $request->validate([
            'role' => 'required|string|max:50',
            'identifier' => 'required|string|max:255',
            'password' => 'required|string|max:255',
        ]);
        $id = strtolower(trim($data['identifier']));

        $account = User::with('role')
            ->whereHas('role', fn ($q) => $q->where('key', $data['role']))
            ->where(fn ($q) => $q->whereRaw('LOWER(username) = ?', [$id])->orWhereRaw('LOWER(email) = ?', [$id]))
            ->first();

        if (! $account || ! Hash::check($data['password'], $account->password)) {
            throw new ApiError('Incorrect credentials. Please check your details and try again.', 401);
        }
        if ($account->status !== 'Active') {
            throw new ApiError('This account is disabled. Please contact the system administrator.', 403);
        }
        if (Rules::settings()->maintenance_mode && $account->role->key !== 'admin') {
            throw new ApiError('The system is under maintenance. Only administrators can log in right now.', 503);
        }

        Rules::logActivity($account, 'Successful staff sign-in', 'security', $account->user_id);
        $token = $account->createToken('ssis', ['*'], now()->addHours(8))->plainTextToken;

        return [
            'user' => Resources::sessionUser($account),
            'roles' => [['key' => $account->role->key, 'label' => $account->role->label]],
            'token' => $token,
        ];
    }

    // GET /api/me   (restores the session after a page refresh)
    public function me(Request $request)
    {
        return response()->json(['user' => Resources::sessionUser($request->user()->load('role'))])->header('Cache-Control','no-store');
    }

    // POST /api/logout
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return ['ok' => true];
    }
}
