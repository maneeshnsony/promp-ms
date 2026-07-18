<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

// Public liveness/readiness probe — no auth (monitors must reach it without a token).
$routes->get('api/v1/health', 'Api\V1\HealthController::index', ['filter' => 'cors']);

// Public login exchange — verifies Google's ID token and mints our own session JWT.
$routes->post('api/v1/auth/google', 'Api\V1\AuthController::google', ['filter' => 'cors']);

// Protected group — CRUD routes land here in the next Phase 1 slice.
$routes->group('api/v1', ['filter' => ['cors', 'auth']], function ($routes) {
});
