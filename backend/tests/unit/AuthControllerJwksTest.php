<?php

use App\Controllers\Api\V1\AuthController;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use Config\Services;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * A real Google-signed ID token with a mismatched `aud` needs a mocked JWKS response
 * rather than a live network fetch to test deterministically — the gap called out in
 * docs/CROSS-CUTTING-ONGOING-PLAN.md. AuthController::googleJwks() is now an overridable
 * protected method for exactly this; this subclass swaps in a fixture keypair (generated
 * once, embedded below — not generated at test-run time, since openssl_pkey_new() needs
 * a working openssl.cnf that isn't guaranteed on every host/CI runner) instead of
 * Google's live JWKS endpoint.
 *
 * @internal
 */
final class AuthControllerJwksTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $DBGroup   = 'tests';
    protected $namespace = null;

    private const GOOGLE_CLIENT_ID = 'phpunit-test-google-client-id';
    private const GOOGLE_SUB       = 'phpunit-authjwks-test-sub';

    /** @var array<string, string|false> Saved so other test files' reliance on real env values isn't disturbed. */
    private array $savedEnv = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->savedEnv['GOOGLE_CLIENT_ID']     = $_ENV['GOOGLE_CLIENT_ID'] ?? false;
        $this->savedEnv['GOOGLE_ALLOWED_DOMAIN'] = $_ENV['GOOGLE_ALLOWED_DOMAIN'] ?? false;

        $_ENV['GOOGLE_CLIENT_ID'] = self::GOOGLE_CLIENT_ID;
        unset($_ENV['GOOGLE_ALLOWED_DOMAIN']);
    }

    protected function tearDown(): void
    {
        foreach ($this->savedEnv as $key => $value) {
            if ($value === false) {
                unset($_ENV[$key]);
            } else {
                $_ENV[$key] = $value;
            }
        }

        $this->db->table('users')->where('google_sub', self::GOOGLE_SUB)->delete();

        parent::tearDown();
    }

    // Test-only RSA keypair — not used for anything but signing fixture tokens in this file.
    public const FIXTURE_PRIVATE_KEY = <<<'PEM'
        -----BEGIN RSA PRIVATE KEY-----
        MIIEowIBAAKCAQEAoXzM5QY4QEIQWBbu/A5CL5mvCdVvi+dpo5wQ7wXligzKgRyt
        cuFn2TBARI89TQr049SqKjDaNKl7+DFsORe3EDB5qyK4ZwJhVeaC7tvJWJ/kjRpb
        GCbuQRT9MFuc3WZSK5ze4xOF3qhst/kJAQiGZlz3EOyZJfsFr95yUMPMCTPuvRJa
        Gx2bfr7h0PHvKCcXlPKkM5ONc5pTVEfBBjo4Pi1NfVQJbJ0kSIJe//CArmgJ2BSD
        LXe+7ky1dquWsaaxC8FggYdEIEhMYEmrngemnzv0Fn0Ua/fgzOZfmPOWZCRQTJS/
        x4ppd9PRtjAYd8dxveP0kfh3o5PgZpCklsyubQIDAQABAoIBACq0GHC14NkpPy40
        PlVcJed1ggKdNOavttFDm3zBt+32LPTQkxNuhOo7prsaj9DYRWMcITWP/pvvd69t
        zlsYqNm4n+v//fiLehbfop8scsWjXqprnkw4O0ftl3iauVQY00DiNlShHIUBT+Kk
        kdt6mCPokJMipesTwvC7Z8pwxHtoGzLyENso4FhtCr7cIl2nuk5uKU66uYhE6Mek
        vLT2KYtPZEyVB79xf9BtI01xNzKCuiCVogwoNubSBlofS3OOzk1M0+TupDnuTnba
        Xq+ek0mPxt37RfjsYyKhX/hKlC83wb0GP04S6g5SpurBtUvHs90797ZywoYtHOLv
        N55fGNcCgYEA0cPf9bP4aBrPxbnJSa6SQWoOQNc83uFwSHcN+cl2Cu4e+QB9wc4c
        4/j7FXqprLK5ThQa9hfGOm2xjQ9LXBKZki75d1rte94gRrB634nEEHR/nd5qTwpI
        38I7aicyC3+3+05L2OrT0UffDQDrzmo8w/hBSTYo7BU7PbCYs/a5ZxcCgYEAxRTU
        p34Nff9bBX3Fk7cTCekIgjhkLej2mXYiVn9K17YhBZ1lcRGa+gkgpJ28/eTzOkAi
        T7+jKJ9JsnFSir6wNX+XkVJ27wDdfG0fqBaUTNxRyFdIovIqyiKczHU9zU8AX8Pb
        EduQsicCQj0mNqLACCc78rjBGzQvexmWQvu5CRsCgYBDbEsrRYqdo6iO7FWHqmX2
        QqmMK+Kz3RBjKmlClX+sqbco4ACL770Xharmz4OEL/oh35J+8UtU8nc0WOsnEA9u
        jky/EWnt+4qyTf1gpn5vr5JpYtkWyL59tYe1ah3K1mWDkDoO4gPta8WE/3vL4Bfi
        AYSyjIcAwx5EiOO8TJxxRwKBgDOb8twxrELUffeAKh82j+vGdI31SnajTQB+6RsR
        ln3KmfcocoobfCQCA+RX0kgCjpcweEu9+XIH1HrAJkdjDC3WTdCmcbLA3T9aLDIO
        R6OhBmGaSdEx7Xalfb4k7Zw4Ffb+CP4yK0Ab6wGBleI02GjKLW6wZxFCpzRrTOgZ
        lykFAoGBAKjGY6bfCUp9MR3n+foEwu5NHLWY+g6khgB8SYh85k6mVt5mR6ldLdpc
        cIGxShoR9BEUXg3ae3CpxSd+h+3egxIqyD5ImQoaL1QECsX0I1cePBSX1RIbMbBX
        /3zJnGDEj74q0O2zdexg61HSUHuwrCA5v5AWvJDYor46LDibsi7j
        -----END RSA PRIVATE KEY-----
        PEM;

    public const FIXTURE_PUBLIC_KEY = <<<'PEM'
        -----BEGIN RSA PUBLIC KEY-----
        MIIBCgKCAQEAoXzM5QY4QEIQWBbu/A5CL5mvCdVvi+dpo5wQ7wXligzKgRytcuFn
        2TBARI89TQr049SqKjDaNKl7+DFsORe3EDB5qyK4ZwJhVeaC7tvJWJ/kjRpbGCbu
        QRT9MFuc3WZSK5ze4xOF3qhst/kJAQiGZlz3EOyZJfsFr95yUMPMCTPuvRJaGx2b
        fr7h0PHvKCcXlPKkM5ONc5pTVEfBBjo4Pi1NfVQJbJ0kSIJe//CArmgJ2BSDLXe+
        7ky1dquWsaaxC8FggYdEIEhMYEmrngemnzv0Fn0Ua/fgzOZfmPOWZCRQTJS/x4pp
        d9PRtjAYd8dxveP0kfh3o5PgZpCklsyubQIDAQAB
        -----END RSA PUBLIC KEY-----
        PEM;

    private function signFixtureToken(array $claims): string
    {
        return JWT::encode($claims, self::FIXTURE_PRIVATE_KEY, 'RS256', 'test-kid');
    }

    private function makeControllerWithFixtureJwks(string $jsonBody): AuthController
    {
        $controller = new class () extends AuthController {
            protected function googleJwks(): array
            {
                return ['test-kid' => new Key(AuthControllerJwksTest::FIXTURE_PUBLIC_KEY, 'RS256')];
            }
        };

        $request = Services::incomingrequest(null, false);
        $request->setBody($jsonBody);

        $controller->initController($request, Services::response(), Services::logger());

        return $controller;
    }

    public function testMismatchedAudienceReturns401(): void
    {
        $token = $this->signFixtureToken([
            'aud'   => 'some-other-client-id',
            'email' => 'user@example.com',
            'iat'   => time(),
            'exp'   => time() + 3600,
        ]);

        $controller = $this->makeControllerWithFixtureJwks(json_encode(['id_token' => $token]));

        $response = $controller->google();

        $this->assertSame(401, $response->getStatusCode());
        $body = json_decode($response->getBody(), true);
        $this->assertSame('Invalid Google token', $body['message']);
    }

    public function testMismatchedIssuerReturns401(): void
    {
        $token = $this->signFixtureToken([
            'aud'   => self::GOOGLE_CLIENT_ID,
            'iss'   => 'https://not-google.example.com',
            'email' => 'user@example.com',
            'iat'   => time(),
            'exp'   => time() + 3600,
        ]);

        $controller = $this->makeControllerWithFixtureJwks(json_encode(['id_token' => $token]));

        $response = $controller->google();

        $this->assertSame(401, $response->getStatusCode());
        $body = json_decode($response->getBody(), true);
        $this->assertSame('Invalid Google token', $body['message']);
    }

    public function testValidTokenReturns200AndIssuesSessionJwt(): void
    {
        $token = $this->signFixtureToken([
            'aud'   => self::GOOGLE_CLIENT_ID,
            'iss'   => 'https://accounts.google.com',
            'sub'   => self::GOOGLE_SUB,
            'email' => 'phpunit-authjwks@example.com',
            'name'  => 'PHPUnit AuthJwks',
            'iat'   => time(),
            'exp'   => time() + 3600,
        ]);

        $controller = $this->makeControllerWithFixtureJwks(json_encode(['id_token' => $token]));

        $response = $controller->google();

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode($response->getBody(), true);

        $this->assertSame('success', $body['status']);
        $this->assertNotEmpty($body['data']['token']);
        $this->assertSame('phpunit-authjwks@example.com', $body['data']['user']['email']);

        $this->seeInDatabase('users', [
            'google_sub' => self::GOOGLE_SUB,
            'email'      => 'phpunit-authjwks@example.com',
        ]);
    }

    public function testAllowedDomainRestrictionRejectsMismatchedHostedDomain(): void
    {
        $_ENV['GOOGLE_ALLOWED_DOMAIN'] = 'allowed.example.com';

        $token = $this->signFixtureToken([
            'aud'   => self::GOOGLE_CLIENT_ID,
            'iss'   => 'https://accounts.google.com',
            'sub'   => self::GOOGLE_SUB,
            'email' => 'user@other.example.com',
            'hd'    => 'other.example.com',
            'iat'   => time(),
            'exp'   => time() + 3600,
        ]);

        $controller = $this->makeControllerWithFixtureJwks(json_encode(['id_token' => $token]));

        $response = $controller->google();

        $this->assertSame(401, $response->getStatusCode());
        $body = json_decode($response->getBody(), true);
        $this->assertSame('Google account domain not allowed', $body['message']);
    }

    public function testAllowedDomainRestrictionAcceptsMatchingHostedDomain(): void
    {
        $_ENV['GOOGLE_ALLOWED_DOMAIN'] = 'allowed.example.com';

        $token = $this->signFixtureToken([
            'aud'   => self::GOOGLE_CLIENT_ID,
            'iss'   => 'https://accounts.google.com',
            'sub'   => self::GOOGLE_SUB,
            'email' => 'user@allowed.example.com',
            'hd'    => 'allowed.example.com',
            'iat'   => time(),
            'exp'   => time() + 3600,
        ]);

        $controller = $this->makeControllerWithFixtureJwks(json_encode(['id_token' => $token]));

        $response = $controller->google();

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode($response->getBody(), true);
        $this->assertSame('success', $body['status']);
    }
}
