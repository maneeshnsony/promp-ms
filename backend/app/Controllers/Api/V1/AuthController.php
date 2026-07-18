<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseController;
use App\Models\UserModel;
use CodeIgniter\API\ResponseTrait;
use CodeIgniter\HTTP\ResponseInterface;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Throwable;

class AuthController extends BaseController
{
    use ResponseTrait;

    public function google(): ResponseInterface
    {
        $idToken = $this->request->getJSON(true)['id_token'] ?? null;

        if (empty($idToken)) {
            return $this->respond([
                'status'  => 'error',
                'data'    => null,
                'message' => 'id_token is required',
            ], ResponseInterface::HTTP_BAD_REQUEST);
        }

        try {
            $jwks = json_decode(file_get_contents('https://www.googleapis.com/oauth2/v3/certs'), true);
            $keys = JWK::parseKeySet($jwks);
            $claims = JWT::decode($idToken, $keys);
        } catch (Throwable $e) {
            log_message('error', 'Google ID token verification failed: {message}', ['message' => $e->getMessage()]);

            return $this->respond([
                'status'  => 'error',
                'data'    => null,
                'message' => 'Invalid Google token',
            ], ResponseInterface::HTTP_UNAUTHORIZED);
        }

        if ($claims->aud !== env('GOOGLE_CLIENT_ID')) {
            return $this->respond([
                'status'  => 'error',
                'data'    => null,
                'message' => 'Invalid Google token',
            ], ResponseInterface::HTTP_UNAUTHORIZED);
        }

        $allowedDomain = env('GOOGLE_ALLOWED_DOMAIN');
        if (! empty($allowedDomain) && ($claims->hd ?? null) !== $allowedDomain) {
            return $this->respond([
                'status'  => 'error',
                'data'    => null,
                'message' => 'Google account domain not allowed',
            ], ResponseInterface::HTTP_UNAUTHORIZED);
        }

        $user = (new UserModel())->upsertFromGoogle($claims);

        $now = time();
        $payload = [
            'sub'   => (int) $user['id'],
            'email' => $user['email'],
            'iat'   => $now,
            'exp'   => $now + 3600,
        ];
        $token = JWT::encode($payload, env('APP_JWT_SECRET'), 'HS256');

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'token' => $token,
                'user'  => $user,
            ],
        ], ResponseInterface::HTTP_OK);
    }
}
