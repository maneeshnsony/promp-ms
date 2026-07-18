<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

// Public liveness/readiness probe — no auth (monitors must reach it without a token).
$routes->get('api/v1/health', 'Api\V1\HealthController::index', ['filter' => 'cors']);
