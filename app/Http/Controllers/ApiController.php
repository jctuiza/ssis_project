<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\User;
use Illuminate\Http\Request;

/** Shared helpers: permission checks (the real "backend" enforcement) and lookups by public username. */
abstract class ApiController extends Controller
{
    /** The signed-in user must hold at least one of the permissions. */
    protected function need(Request $request, string ...$permissions): User
    {
        $user = $request->user();
        if (! array_intersect($permissions, $user->permissionKeys())) {
            throw new ApiError('You do not have permission to do that.', 403);
        }

        return $user;
    }

    protected function can(User $user, string ...$permissions): bool
    {
        return (bool) array_intersect($permissions, $user->permissionKeys());
    }

    /** Staff tied to a department only see and change students of that department. */
    protected function inScope(User $user, int $studentId): bool
    {
        return ! $user->department_id || User::where('user_id', $studentId)->value('department_id') === $user->department_id;
    }

    /** Department staff are always limited to their own department; other staff may filter by ?department_id. */
    protected function scopeDepartment(User $user, $requested): ?int
    {
        return $user->department_id ?: ($requested ? (int) $requested : null);
    }

    protected function userByUsername(string $username): User
    {
        return User::with('role')->where('username', $username)->first() ?? throw new ApiError('User not found.', 404);
    }

    protected function studentByUsername(string $username): User
    {
        $user = $this->userByUsername($username);
        if (! $user->isStudent()) {
            throw new ApiError('Student not found.', 404);
        }

        return $user;
    }

    /** A student may only open their own records; staff need one of the given permissions. */
    protected function ownOrStaff(Request $request, string $username, string ...$permissions): User
    {
        $me = $request->user();
        if ($me->isStudent()) {
            if ($me->username !== $username) {
                throw new ApiError('You can only view your own records.', 403);
            }

            return $this->studentByUsername($username);
        }
        $this->need($request, ...$permissions);

        return $this->studentByUsername($username);
    }

    protected function log(Request $request, string $action, ?string $type = null, $id = null): void
    {
        \App\Support\Rules::logActivity($request->user(), $action, $type, $id);
    }

    protected function temporaryPassword(): string
    {
        $letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
        $digits = '23456789';
        $pick = fn (string $chars) => $chars[random_int(0, strlen($chars) - 1)];
        $chars = [$pick($letters), $pick($digits)];
        for ($i = 0; $i < 6; $i++) {
            $chars[] = $pick($letters.$digits);
        }
        shuffle($chars);

        return implode('', $chars);
    }
}
