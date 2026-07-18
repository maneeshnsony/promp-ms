<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

// Public liveness/readiness probe — no auth (monitors must reach it without a token).
$routes->get('api/v1/health', 'Api\V1\HealthController::index', ['filter' => 'cors']);

// Public login exchange — verifies Google's ID token and mints our own session JWT.
$routes->post('api/v1/auth/google', 'Api\V1\AuthController::google', ['filter' => 'cors']);

// Protected group — CRUD routes.
$routes->group('api/v1', ['namespace' => 'App\Controllers\Api\V1', 'filter' => ['cors', 'auth']], static function ($routes) {
    $routes->get('prompts', 'PromptController::index');
    $routes->get('prompts/(:num)', 'PromptController::show/$1');
    $routes->post('prompts', 'PromptController::create');
    $routes->put('prompts/(:num)', 'PromptController::update/$1');
    $routes->delete('prompts/(:num)', 'PromptController::delete/$1');
    $routes->post('prompts/(:num)/copy', 'PromptController::trackCopy/$1');
    $routes->get('prompts/(:num)/versions', 'PromptController::versions/$1');

    $routes->get('categories', 'CategoryController::index');
    $routes->post('categories', 'CategoryController::create');
    $routes->put('categories/(:num)', 'CategoryController::update/$1');
    $routes->delete('categories/(:num)', 'CategoryController::delete/$1');

    $routes->get('tags', 'TagController::index');
    $routes->post('tags', 'TagController::create');
    $routes->put('tags/(:num)', 'TagController::update/$1');
    $routes->delete('tags/(:num)', 'TagController::delete/$1');

    $routes->get('roles', 'RoleController::index');
    $routes->post('roles', 'RoleController::create');
    $routes->put('roles/(:num)', 'RoleController::update/$1');
    $routes->delete('roles/(:num)', 'RoleController::delete/$1');
});
