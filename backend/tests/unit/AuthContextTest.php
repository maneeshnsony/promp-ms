<?php

use App\Libraries\AuthContext;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class AuthContextTest extends CIUnitTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Static state must not leak between tests.
        $this->resetClaims();
    }

    protected function tearDown(): void
    {
        $this->resetClaims();

        parent::tearDown();
    }

    private function resetClaims(): void
    {
        $ref  = new ReflectionClass(AuthContext::class);
        $prop = $ref->getProperty('claims');
        $prop->setAccessible(true);
        $prop->setValue(null, null);
    }

    public function testIdAndEmailAreNullBeforeSet(): void
    {
        $this->assertNull(AuthContext::id());
        $this->assertNull(AuthContext::email());
    }

    public function testIdAndEmailReflectSetClaims(): void
    {
        AuthContext::set((object) ['sub' => 7, 'email' => 'user@example.com']);

        $this->assertSame(7, AuthContext::id());
        $this->assertSame('user@example.com', AuthContext::email());
    }
}
