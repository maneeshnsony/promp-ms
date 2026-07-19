<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

// Public liveness/readiness probe — no auth (monitors must reach it without a token).
$routes->get('api/v1/health', 'Api\V1\HealthController::index', ['filter' => 'cors']);

// Public login exchange — verifies Google's ID token and mints our own session JWT.
// Rate-limited (keyed by IP, since there's no authenticated user yet at this point).
$routes->post('api/v1/auth/google', 'Api\V1\AuthController::google', ['filter' => ['cors', 'ratelimit']]);

// Protected group — CRUD routes. Write methods (POST/PUT/DELETE) are additionally
// rate-limited (keyed by user id once AuthFilter has run) per
// docs/CROSS-CUTTING-ONGOING-PLAN.md.
$routes->group('api/v1', ['namespace' => 'App\Controllers\Api\V1', 'filter' => ['cors', 'auth']], static function ($routes) {
    $routes->get('prompts', 'PromptController::index');
    $routes->get('prompts/(:num)', 'PromptController::show/$1');
    $routes->post('prompts', 'PromptController::create', ['filter' => 'ratelimit']);
    $routes->put('prompts/(:num)', 'PromptController::update/$1', ['filter' => 'ratelimit']);
    $routes->delete('prompts/(:num)', 'PromptController::delete/$1', ['filter' => 'ratelimit']);
    // Higher capacity than other writes — this fires on every card copy click, a much
    // higher-frequency action than an actual create/update/delete (see RateLimitFilter).
    $routes->post('prompts/(:num)/copy', 'PromptController::trackCopy/$1', ['filter' => 'ratelimit:180']);
    $routes->get('prompts/(:num)/versions', 'PromptController::versions/$1');

    $routes->get('categories', 'CategoryController::index');
    $routes->post('categories', 'CategoryController::create', ['filter' => 'ratelimit']);
    $routes->put('categories/(:num)', 'CategoryController::update/$1', ['filter' => 'ratelimit']);
    $routes->delete('categories/(:num)', 'CategoryController::delete/$1', ['filter' => 'ratelimit']);

    $routes->get('tags', 'TagController::index');
    $routes->post('tags', 'TagController::create', ['filter' => 'ratelimit']);
    $routes->put('tags/(:num)', 'TagController::update/$1', ['filter' => 'ratelimit']);
    $routes->delete('tags/(:num)', 'TagController::delete/$1', ['filter' => 'ratelimit']);

    $routes->get('roles', 'RoleController::index');
    $routes->post('roles', 'RoleController::create', ['filter' => 'ratelimit']);
    $routes->put('roles/(:num)', 'RoleController::update/$1', ['filter' => 'ratelimit']);
    $routes->delete('roles/(:num)', 'RoleController::delete/$1', ['filter' => 'ratelimit']);
});
