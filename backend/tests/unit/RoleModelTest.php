<?php

use App\Models\RoleModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;

/**
 * @internal
 */
final class RoleModelTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $DBGroup   = 'tests';
    protected $namespace = null;

    private const NAME = 'PHPUnit Test RoleModel';
    private const SLUG = 'phpunit-test-rolemodel';

    protected function tearDown(): void
    {
        $this->db->table('roles')->like('slug', self::SLUG)->delete();

        parent::tearDown();
    }

    public function testInsertFailsWithoutName(): void
    {
        $model = new RoleModel();

        $result = $model->insert(['slug' => self::SLUG]);

        $this->assertFalse($result);
        $this->assertArrayHasKey('name', $model->errors());
    }

    public function testInsertFailsWithoutSlug(): void
    {
        $model = new RoleModel();

        $result = $model->insert(['name' => self::NAME]);

        $this->assertFalse($result);
        $this->assertArrayHasKey('slug', $model->errors());
    }

    public function testInsertFailsOnDuplicateName(): void
    {
        $this->db->table('roles')->insert(['name' => self::NAME, 'slug' => self::SLUG]);

        $model  = new RoleModel();
        $result = $model->insert(['name' => self::NAME, 'slug' => self::SLUG . '-dup-name']);

        $this->assertFalse($result);
        $this->assertArrayHasKey('name', $model->errors());
    }

    public function testInsertFailsOnDuplicateSlug(): void
    {
        $this->db->table('roles')->insert(['name' => self::NAME, 'slug' => self::SLUG]);

        $model  = new RoleModel();
        $result = $model->insert(['name' => self::NAME . ' Dup Slug', 'slug' => self::SLUG]);

        $this->assertFalse($result);
        $this->assertArrayHasKey('slug', $model->errors());
    }

    public function testInsertSucceedsWithUniqueData(): void
    {
        $model = new RoleModel();

        $id = $model->insert(['name' => self::NAME, 'slug' => self::SLUG], true);

        $this->assertIsNumeric($id);
        $this->seeInDatabase('roles', ['name' => self::NAME, 'slug' => self::SLUG]);
    }
}
