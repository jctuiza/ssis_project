<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_protected_api_requires_authentication(): void
    {
        $this->getJson('/api/enrollment-requests')->assertUnauthorized();
    }
}
