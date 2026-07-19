<?php

use App\Filters\RateLimitFilter;
use App\Libraries\AuthContext;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Services;

/**
 * @internal
 */
final class RateLimitFilterTest extends CIUnitTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->resetClaims();
        $this->resetBucket();
    }

    protected function tearDown(): void
    {
        $this->resetClaims();
        $this->resetBucket();
        parent::tearDown();
    }

    /** Clears the token bucket for the IP the CLI test runner uses, so tests don't leak into each other. */
    private function resetBucket(): void
    {
        $throttler = Services::throttler(false);
        $ip        = $this->makeRequest()->getIPAddress();
        $throttler->remove('user_' . $ip . '_60');
        $throttler->remove('user_' . $ip . '_180');
    }

    private function resetClaims(): void
    {
        $ref  = new ReflectionClass(AuthContext::class);
        $prop = $ref->getProperty('claims');
        $prop->setAccessible(true);
        $prop->setValue(null, null);
    }

    private function makeRequest(): IncomingRequest
    {
        return Services::incomingrequest(null, false);
    }

    public function testNormalTrafficBelowThresholdPassesThrough(): void
    {
        $filter = new RateLimitFilter();

        $result = $filter->before($this->makeRequest());

        $this->assertNull($result);
    }

    public function testExceedingTheThresholdReturns429(): void
    {
        $filter  = new RateLimitFilter();
        $request = $this->makeRequest();

        $response = null;
        for ($i = 0; $i < 61; $i++) {
            $response = $filter->before($request);
        }

        $this->assertInstanceOf(ResponseInterface::class, $response);
        $this->assertSame(429, $response->getStatusCode());

        $body = json_decode($response->getBody(), true);
        $this->assertSame('error', $body['status']);
    }

    public function testPerRouteCapacityArgumentOverridesTheDefault(): void
    {
        $filter  = new RateLimitFilter();
        $request = $this->makeRequest();

        // Default (60/min) bucket would already be exhausted by 61 requests, but a route
        // passing a higher capacity argument (e.g. `ratelimit:180`) uses its own bucket.
        $response = null;
        for ($i = 0; $i < 61; $i++) {
            $response = $filter->before($request, ['180']);
        }

        $this->assertNull($response);
    }

    public function testSkipRateLimitBypassesTheCheck(): void
    {
        putenv('SKIP_RATE_LIMIT=true');

        try {
            $filter  = new RateLimitFilter();
            $request = $this->makeRequest();

            $response = null;
            for ($i = 0; $i < 61; $i++) {
                $response = $filter->before($request);
            }

            $this->assertNull($response);
        } finally {
            putenv('SKIP_RATE_LIMIT');
        }
    }
}
