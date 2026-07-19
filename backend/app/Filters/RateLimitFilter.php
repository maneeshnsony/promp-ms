<?php

namespace App\Filters;

use App\Libraries\AuthContext;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Throttles write endpoints (POST/PUT/DELETE under api/v1) and auth/google, keyed by
 * authenticated user id where available (post-AuthFilter) or by IP otherwise. Uses CI4's
 * built-in Throttler (token bucket) rather than Nginx `limit_req`, per
 * docs/CROSS-CUTTING-ONGOING-PLAN.md — keeps abuse-prevention in the same app layer as
 * AuthFilter, and testable the same way.
 *
 * Default capacity is 60 req/min, meant for actual mutations (create/update/delete). A
 * route can opt into a different (typically higher) capacity via a filter argument —
 * `'filter' => 'ratelimit:180'` — since some write endpoints are hit far more often
 * during normal use than a real edit/delete (e.g. the fire-and-forget copy-tracking
 * endpoint) and shouldn't share a bucket sized for occasional mutations.
 */
class RateLimitFilter implements FilterInterface
{
    /** Default requests allowed per rolling minute, when no per-route capacity is given. */
    private const DEFAULT_CAPACITY = 60;

    public function before(RequestInterface $request, $arguments = null)
    {
        if ((bool) env('SKIP_RATE_LIMIT', false)) {
            return;
        }

        $capacity = isset($arguments[0]) ? (int) $arguments[0] : self::DEFAULT_CAPACITY;

        // Bucket name includes the capacity so routes sharing a filter alias but different
        // capacities (e.g. `ratelimit` vs `ratelimit:180`) don't stomp on each other's tokens.
        $key = 'user_' . (AuthContext::id() ?? $request->getIPAddress()) . '_' . $capacity;

        $throttler = Services::throttler();
        if (! $throttler->check($key, $capacity, MINUTE)) {
            return Services::response()
                ->setStatusCode(ResponseInterface::HTTP_TOO_MANY_REQUESTS)
                ->setJSON([
                    'status'  => 'error',
                    'data'    => null,
                    'message' => 'Too many requests — please slow down.',
                ]);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
