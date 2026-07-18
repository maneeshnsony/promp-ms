<?php

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Firebase\JWT\JWT;

/**
 * @internal
 */
final class TagControllerTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $DBGroup   = 'tests';
    protected $namespace = null;

    private const NAME = 'PHPUnit Test Tag';
    private const SLUG = 'phpunit-test-tag';

    protected function tearDown(): void
    {
        $this->db->table('tags')->where('slug', self::SLUG)->delete();

        parent::tearDown();
    }

    private function authHeader(): array
    {
        $token = JWT::encode([
            'sub'   => 1,
            'email' => 'phpunit@example.com',
            'iat'   => time(),
            'exp'   => time() + 3600,
        ], env('APP_JWT_SECRET'), 'HS256');

        return ['Authorization' => 'Bearer ' . $token];
    }

    public function testNoBearerTokenReturns401(): void
    {
        $result = $this->get('api/v1/tags');

        $result->assertStatus(401);
    }

    public function testCreateReturns201AndPersists(): void
    {
        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->post('api/v1/tags', ['name' => self::NAME, 'slug' => self::SLUG]);

        $result->assertStatus(201);
        $this->seeInDatabase('tags', ['name' => self::NAME, 'slug' => self::SLUG]);
    }

    public function testCreateWithDuplicateSlugFailsValidation(): void
    {
        $this->db->table('tags')->insert(['name' => self::NAME, 'slug' => self::SLUG]);

        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->post('api/v1/tags', ['name' => self::NAME . ' 2', 'slug' => self::SLUG]);

        $result->assertStatus(400);
    }

    public function testUpdateChangesFields(): void
    {
        $this->db->table('tags')->insert(['name' => self::NAME, 'slug' => self::SLUG]);
        $id = $this->db->insertID();

        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->put('api/v1/tags/' . $id, ['name' => self::NAME . ' Updated', 'slug' => self::SLUG]);

        $result->assertStatus(200);
        $this->seeInDatabase('tags', ['id' => $id, 'name' => self::NAME . ' Updated']);
    }

    public function testDeleteRemovesRow(): void
    {
        $this->db->table('tags')->insert(['name' => self::NAME, 'slug' => self::SLUG]);
        $id = $this->db->insertID();

        $result = $this->withHeaders($this->authHeader())->delete('api/v1/tags/' . $id);

        $result->assertStatus(200);
        $this->dontSeeInDatabase('tags', ['id' => $id]);
    }
}
