<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\StudentProfile;
use App\Models\User;
use App\Support\Check;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AccountController extends ApiController
{
    // PUT /api/account/password  { currentPassword, newPassword }
    public function changePassword(Request $request)
    {
        $user = $request->user();
        $current = (string) $request->input('currentPassword', '');
        $new = (string) $request->input('newPassword', '');

        if (! Hash::check($current, $user->password)) {
            throw new ApiError('Your current password is incorrect.');
        }
        if ($issue = Check::passwordIssue($new)) {
            throw new ApiError($issue);
        }
        if ($new === $current) {
            throw new ApiError('Choose a password different from your current one.');
        }

        $user->update(['password' => $new, 'must_change_password' => false]);
        // Sign out every other device that still holds an older token.
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();
        $this->log($request, 'Changed own password', 'user', $user->username);

        return ['ok' => true];
    }

    // PATCH /api/account/profile
    // Staff: name, email, contact. Students: email, contact, address and emergency contact (the Registrar manages the rest).
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $patch = $request->all();
        $isStudent = $user->isStudent();

        if ($isStudent && array_key_exists('name', $patch)) {
            throw new ApiError('Your name is managed by the Registrar.', 403);
        }
        $errors = Check::profile($patch, canEditName: ! $isStudent);
        if (! isset($errors['email']) && array_key_exists('email', $patch)) {
            $email = trim($patch['email']);
            if (User::whereRaw('LOWER(email) = ?', [strtolower($email)])->where('user_id', '!=', $user->user_id)->exists()) {
                $errors['email'] = 'That email is already used by another account.';
            }
        }
        if ($errors) {
            throw new ApiError('Please correct the highlighted fields.', 422, $errors);
        }

        $changes = [];
        if (! $isStudent && array_key_exists('name', $patch)) {
            $changes['name'] = trim($patch['name']);
        }
        if (array_key_exists('email', $patch)) {
            $changes['email'] = trim($patch['email']);
        }
        if (array_key_exists('contact', $patch)) {
            $changes['contact'] = trim($patch['contact']);
        }
        if ($changes) {
            $user->update($changes);
        }

        if ($isStudent) {
            $profile = [];
            foreach (['address' => 'address', 'emergencyName' => 'emergency_name', 'emergencyContact' => 'emergency_contact'] as $key => $column) {
                if (array_key_exists($key, $patch)) {
                    $profile[$column] = mb_substr(trim((string) $patch[$key]), 0, 255);
                }
            }
            if ($profile) {
                StudentProfile::where('user_id', $user->user_id)->update($profile);
            }
        }

        $this->log($request, 'Updated own profile', 'user', $user->username);

        return Resources::sessionUser($user->fresh('role'));
    }

    // POST /api/account/photo  { photo }   (data URL, or null to remove). The user always comes from the token.
    public function updatePhoto(Request $request)
    {
        $photo = $request->input('photo');
        if ($photo !== null) {
            if (! is_string($photo) || ! preg_match('#^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$#', $photo) || strlen($photo) > 1_500_000) {
                throw new ApiError('Upload a PNG, JPEG or WebP picture under 1 MB.');
            }
        }
        $request->user()->update(['profile_photo' => $photo]);
        $this->log($request, $photo ? 'Updated own profile picture' : 'Removed own profile picture', 'user', $request->user()->username);

        return ['photo' => $photo];
    }

    // GET /api/notifications
    public function notifications(Request $request)
    {
        return Rules::feedFor($request->user(), 20);
    }

    // POST /api/notifications/read
    public function markRead(Request $request)
    {
        $user = $request->user();
        $ids = Rules::visibleNotifications($user)->pluck('notification_id');
        $already = \DB::table('notification_reads')->where('user_id', $user->user_id)->whereIn('notification_id', $ids)->pluck('notification_id');
        $rows = $ids->diff($already)->map(fn ($id) => ['notification_id' => $id, 'user_id' => $user->user_id, 'read_at' => now()])->values()->all();
        if ($rows) {
            \DB::table('notification_reads')->insertOrIgnore($rows);
        }

        return ['ok' => true];
    }
}
