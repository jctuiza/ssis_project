<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SessionSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function account(string $role): User
    {
        $r = Role::firstOrCreate(['key' => $role], ['label' => ucfirst($role)]);
        SystemSetting::firstOrCreate(['system_name' => 'SSIS'], ['current_term' => 'First Semester, A.Y. 2026-2027']);

        return User::create(['username' => $role, 'name' => $role, 'email' => $role.'@example.test', 'password' => 'test-password', 'role_id' => $r->role_id, 'status' => 'Active', 'must_change_password' => false]);
    }

    public static function roles(): array
    {
        return array_map(fn ($r) => [$r], ['admin', 'student', 'registrar', 'cashier', 'department']);
    }

    private function signIn(string $role): string
    {
        $response = $this->withHeaders(['Origin' => 'http://127.0.0.1:4173', 'X-SSIS-Request' => '1'])->postJson('/api/login', ['role' => $role, 'identifier' => $role, 'password' => 'test-password'])->assertOk()->assertJsonMissingPath('token');
        $cookie = collect($response->headers->getCookies())->first(fn ($c) => $c->getName() === 'ssis_auth');
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('/api', $cookie->getPath());
        $this->assertSame('lax', $cookie->getSameSite());

        return $cookie->getValue();
    }

    private function useCookie(string $cookie): void
    {
        Auth::forgetGuards();
        $this->withCredentials()->withUnencryptedCookies(['ssis_auth' => $cookie]);
    }

    #[DataProvider('roles')]
    public function test_each_portal_restores_session_and_logout_revokes_it(string $role): void
    {
        $this->account($role);
        $cookie = $this->signIn($role);
        $this->useCookie($cookie);
        $this->getJson('/api/me')->assertOk()->assertJsonPath('user.role', $role)->assertHeader('Cache-Control', 'no-store, private');
        $this->useCookie($cookie);
        $this->postJson('/api/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->useCookie($cookie);
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_existing_cookie_blocks_second_login(): void
    {
        $this->account('admin');
        $this->account('student');
        $cookie = $this->signIn('admin');
        $this->useCookie($cookie);
        $this->postJson('/api/login', ['role' => 'student', 'identifier' => 'student', 'password' => 'test-password'])->assertStatus(409);
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_expired_and_disabled_sessions_are_rejected(): void
    {
        $u = $this->account('admin');
        $cookie = $this->signIn('admin');
        PersonalAccessToken::query()->update(['expires_at' => now()->subMinute()]);
        $this->useCookie($cookie);
        $this->getJson('/api/me')->assertUnauthorized();
        PersonalAccessToken::query()->update(['expires_at' => now()->addHour()]);
        $u->update(['status' => 'Inactive']);
        $this->useCookie($cookie);
        $this->getJson('/api/me')->assertUnauthorized();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_cookie_writes_require_trusted_origin_and_custom_header(): void
    {
        $this->account('admin');
        $cookie = $this->signIn('admin');
        $this->useCookie($cookie);
        $this->withHeader('Origin', 'https://attacker.example')->postJson('/api/logout')->assertForbidden();
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->useCookie($cookie);
        $this->withHeaders(['Origin' => 'http://127.0.0.1:4173', 'X-SSIS-Request' => ''])->postJson('/api/logout')->assertForbidden();
    }

    public function test_student_cookie_does_not_grant_staff_access(): void
    {
        $this->account('student');
        $cookie = $this->signIn('student');
        $this->useCookie($cookie);
        $this->getJson('/api/subjects')->assertForbidden();
    }
}
