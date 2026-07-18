<?php

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * @internal
 */
final class AuthControllerTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    public function testMissingIdTokenReturns400(): void
    {
        $result = $this->withBodyFormat('json')->post('api/v1/auth/google', []);

        $result->assertStatus(400);
        $result->assertJSONFragment([
            'status'  => 'error',
            'message' => 'id_token is required',
        ]);
    }

    public function testGarbageIdTokenReturns401(): void
    {
        $result = $this->withBodyFormat('json')->post('api/v1/auth/google', ['id_token' => 'not-a-real-google-token']);

        $result->assertStatus(401);
        $result->assertJSONFragment([
            'status'  => 'error',
            'message' => 'Invalid Google token',
        ]);
    }
}
