<?php

namespace App\Filters;

use App\Libraries\AuthContext;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\SignatureInvalidException;
use UnexpectedValueException;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Dev/testing-only bypass — never opt-in by default. See docs/PHASE1-AUTH-PLAN.md.
        if ((bool) env('SKIP_AUTH', false)) {
            return;
        }

        $header = $request->getHeaderLine('Authorization');

        if (! preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
            return $this->unauthorized('Missing bearer token');
        }

        try {
            $decoded = JWT::decode($matches[1], new Key(env('APP_JWT_SECRET'), 'HS256'));
        } catch (ExpiredException|SignatureInvalidException|UnexpectedValueException $e) {
            return $this->unauthorized('Invalid or expired session');
        }

        AuthContext::set($decoded);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }

    private function unauthorized(string $message): ResponseInterface
    {
        return Services::response()
            ->setStatusCode(ResponseInterface::HTTP_UNAUTHORIZED)
            ->setJSON([
                'status'  => 'error',
                'data'    => null,
                'message' => $message,
            ]);
    }
}
