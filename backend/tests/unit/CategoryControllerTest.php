<?php

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Firebase\JWT\JWT;

/**
 * @internal
 */
final class CategoryControllerTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $DBGroup   = 'tests';
    protected $namespace = null;

    private const NAME = 'PHPUnit Test Category';
    private const SLUG = 'phpunit-test-category';

    protected function tearDown(): void
    {
        $this->db->table('categories')->where('slug', self::SLUG)->delete();
        $this->db->table('categories')->where('slug', self::SLUG . '-2')->delete();

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
        $result = $this->get('api/v1/categories');

        $result->assertStatus(401);
    }

    public function testCreateReturns201AndPersists(): void
    {
        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->post('api/v1/categories', ['name' => self::NAME, 'slug' => self::SLUG]);

        $result->assertStatus(201);
        $result->assertJSONFragment(['status' => 'success']);

        $this->seeInDatabase('categories', ['name' => self::NAME, 'slug' => self::SLUG]);
    }

    public function testCreateWithDuplicateSlugFailsValidation(): void
    {
        $this->db->table('categories')->insert(['name' => self::NAME, 'slug' => self::SLUG]);

        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->post('api/v1/categories', ['name' => self::NAME . ' 2', 'slug' => self::SLUG]);

        $result->assertStatus(400);
    }

    public function testIndexReturnsCreatedRow(): void
    {
        $this->db->table('categories')->insert(['name' => self::NAME, 'slug' => self::SLUG]);

        $result = $this->withHeaders($this->authHeader())->get('api/v1/categories');

        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);
        $slugs = array_column($body['data'], 'slug');
        $this->assertContains(self::SLUG, $slugs);
    }

    public function testUpdateChangesFields(): void
    {
        $this->db->table('categories')->insert(['name' => self::NAME, 'slug' => self::SLUG]);
        $id = $this->db->insertID();

        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->put('api/v1/categories/' . $id, ['name' => self::NAME . ' Updated', 'slug' => self::SLUG]);

        $result->assertStatus(200);
        $this->seeInDatabase('categories', ['id' => $id, 'name' => self::NAME . ' Updated']);
    }

    public function testUpdateMissingReturns404(): void
    {
        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->put('api/v1/categories/999999', ['name' => 'x', 'slug' => 'x']);

        $result->assertStatus(404);
    }

    public function testDeleteRemovesRow(): void
    {
        $this->db->table('categories')->insert(['name' => self::NAME, 'slug' => self::SLUG]);
        $id = $this->db->insertID();

        $result = $this->withHeaders($this->authHeader())->delete('api/v1/categories/' . $id);

        $result->assertStatus(200);
        $this->dontSeeInDatabase('categories', ['id' => $id]);
    }
}
