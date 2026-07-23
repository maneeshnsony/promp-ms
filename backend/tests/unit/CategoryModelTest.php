<?php

use App\Models\CategoryModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;

/**
 * @internal
 */
final class CategoryModelTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $DBGroup   = 'tests';
    protected $namespace = null;

    private const NAME = 'PHPUnit Test CategoryModel';
    private const SLUG = 'phpunit-test-categorymodel';

    protected function tearDown(): void
    {
        $this->db->table('categories')->like('slug', self::SLUG)->delete();

        parent::tearDown();
    }

    public function testInsertFailsWithoutName(): void
    {
        $model = new CategoryModel();

        $result = $model->insert(['slug' => self::SLUG]);

        $this->assertFalse($result);
        $this->assertArrayHasKey('name', $model->errors());
    }

    public function testInsertFailsWithoutSlug(): void
    {
        $model = new CategoryModel();

        $result = $model->insert(['name' => self::NAME]);

        $this->assertFalse($result);
        $this->assertArrayHasKey('slug', $model->errors());
    }

    public function testInsertFailsOnDuplicateName(): void
    {
        $this->db->table('categories')->insert(['name' => self::NAME, 'slug' => self::SLUG]);

        $model  = new CategoryModel();
        $result = $model->insert(['name' => self::NAME, 'slug' => self::SLUG . '-dup-name']);

        $this->assertFalse($result);
        $this->assertArrayHasKey('name', $model->errors());
    }

    public function testInsertFailsOnDuplicateSlug(): void
    {
        $this->db->table('categories')->insert(['name' => self::NAME, 'slug' => self::SLUG]);

        $model  = new CategoryModel();
        $result = $model->insert(['name' => self::NAME . ' Dup Slug', 'slug' => self::SLUG]);

        $this->assertFalse($result);
        $this->assertArrayHasKey('slug', $model->errors());
    }

    public function testInsertSucceedsWithUniqueData(): void
    {
        $model = new CategoryModel();

        $id = $model->insert(['name' => self::NAME, 'slug' => self::SLUG], true);

        $this->assertIsNumeric($id);
        $this->seeInDatabase('categories', ['name' => self::NAME, 'slug' => self::SLUG]);
    }
}
