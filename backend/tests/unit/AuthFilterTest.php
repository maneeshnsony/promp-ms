<?php

use App\Filters\AuthFilter;
use App\Libraries\AuthContext;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Services;
use Firebase\JWT\JWT;

/**
 * @internal
 */
final class AuthFilterTest extends CIUnitTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
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

    private function makeRequest(?string $authHeader = null): IncomingRequest
    {
        $request = Services::incomingrequest(null, false);

        if ($authHeader !== null) {
            $request->setHeader('Authorization', $authHeader);
        }

        return $request;
    }

    private function signToken(array $claims): string
    {
        // Sign with the same secret AuthFilter itself reads, since backend/.env
        // deliberately owns APP_JWT_SECRET (unlike SKIP_AUTH, it's not meant to be
        // overridden per-environment) — see docs/PLAN.md decisions log #13.
        return JWT::encode($claims, env('APP_JWT_SECRET'), 'HS256');
    }

    public function testMissingBearerTokenReturns401(): void
    {
        $filter   = new AuthFilter();
        $response = $filter->before($this->makeRequest());

        $this->assertInstanceOf(ResponseInterface::class, $response);
        $this->assertSame(401, $response->getStatusCode());

        $body = json_decode($response->getBody(), true);
        $this->assertSame('error', $body['status']);
        $this->assertSame('Missing bearer token', $body['message']);
    }

    public function testGarbageTokenReturns401(): void
    {
        $filter   = new AuthFilter();
        $response = $filter->before($this->makeRequest('Bearer not-a-real-jwt'));

        $this->assertInstanceOf(ResponseInterface::class, $response);
        $this->assertSame(401, $response->getStatusCode());

        $body = json_decode($response->getBody(), true);
        $this->assertSame('Invalid or expired session', $body['message']);
    }

    public function testExpiredTokenReturns401(): void
    {
        $token = $this->signToken([
            'sub'   => 1,
            'email' => 'user@example.com',
            'iat'   => time() - 7200,
            'exp'   => time() - 3600,
        ]);

        $filter   = new AuthFilter();
        $response = $filter->before($this->makeRequest('Bearer ' . $token));

        $this->assertInstanceOf(ResponseInterface::class, $response);
        $this->assertSame(401, $response->getStatusCode());
    }

    public function testValidTokenPassesThroughAndPopulatesAuthContext(): void
    {
        $token = $this->signToken([
            'sub'   => 42,
            'email' => 'user@example.com',
            'iat'   => time(),
            'exp'   => time() + 3600,
        ]);

        $filter = new AuthFilter();
        $result = $filter->before($this->makeRequest('Bearer ' . $token));

        $this->assertNull($result);
        $this->assertSame(42, AuthContext::id());
        $this->assertSame('user@example.com', AuthContext::email());
    }

    public function testSkipAuthBypassesTokenCheckWithNoHeaderAtAll(): void
    {
        putenv('SKIP_AUTH=true');

        try {
            $filter = new AuthFilter();
            $result = $filter->before($this->makeRequest());

            $this->assertNull($result);
            $this->assertNull(AuthContext::id());
        } finally {
            putenv('SKIP_AUTH');
        }
    }

    public function testSkipAuthFalseStillEnforcesAuth(): void
    {
        putenv('SKIP_AUTH=false');

        try {
            $filter   = new AuthFilter();
            $response = $filter->before($this->makeRequest());

            $this->assertInstanceOf(ResponseInterface::class, $response);
            $this->assertSame(401, $response->getStatusCode());
        } finally {
            putenv('SKIP_AUTH');
        }
    }
}
