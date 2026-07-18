<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;
use Throwable;

/**
 * Liveness/readiness probe. Public (no auth) so uptime monitors and load
 * balancers can reach it, and reachable through nginx at /api/v1/health.
 *
 * Distinct from the container-level healthcheck in docker-compose.yml: that
 * probes host Postgres from inside the api container for orchestration; this
 * is the HTTP surface external callers hit, and reports the same DB status
 * in the project's standard response envelope.
 */
class HealthController extends BaseController
{
    use ResponseTrait;

    public function index(): ResponseInterface
    {
        $dbUp = false;
        try {
            // Cheapest possible round-trip that proves the connection is live.
            $dbUp = Database::connect()->query('SELECT 1') !== false;
        } catch (Throwable $e) {
            log_message('error', 'Health check DB probe failed: {message}', ['message' => $e->getMessage()]);
        }

        $data = [
            'service'   => 'prompt-ms-api',
            'db'        => $dbUp ? 'up' : 'down',
            'timestamp' => date('c'),
        ];

        if (! $dbUp) {
            return $this->respond([
                'status'  => 'error',
                'data'    => $data,
                'message' => 'Database unreachable',
            ], ResponseInterface::HTTP_SERVICE_UNAVAILABLE);
        }

        return $this->respond([
            'status' => 'success',
            'data'   => $data,
        ], ResponseInterface::HTTP_OK);
    }
}
