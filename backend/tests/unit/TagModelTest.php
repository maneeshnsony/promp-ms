<?php

use App\Models\TagModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;

/**
 * @internal
 */
final class TagModelTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $DBGroup   = 'tests';
    protected $namespace = null;

    private const NAME = 'PHPUnit Test TagModel';
    private const SLUG = 'phpunit-test-tagmodel';

    protected function tearDown(): void
    {
        $this->db->table('tags')->like('slug', self::SLUG)->delete();

        parent::tearDown();
    }

    public function testInsertFailsWithoutName(): void
    {
        $model = new TagModel();

        $result = $model->insert(['slug' => self::SLUG]);

        $this->assertFalse($result);
        $this->assertArrayHasKey('name', $model->errors());
    }

    public function testInsertFailsWithoutSlug(): void
    {
        $model = new TagModel();

        $result = $model->insert(['name' => self::NAME]);

        $this->assertFalse($result);
        $this->assertArrayHasKey('slug', $model->errors());
    }

    public function testInsertFailsOnDuplicateName(): void
    {
        $this->db->table('tags')->insert(['name' => self::NAME, 'slug' => self::SLUG]);

        $model  = new TagModel();
        $result = $model->insert(['name' => self::NAME, 'slug' => self::SLUG . '-dup-name']);

        $this->assertFalse($result);
        $this->assertArrayHasKey('name', $model->errors());
    }

    public function testInsertFailsOnDuplicateSlug(): void
    {
        $this->db->table('tags')->insert(['name' => self::NAME, 'slug' => self::SLUG]);

        $model  = new TagModel();
        $result = $model->insert(['name' => self::NAME . ' Dup Slug', 'slug' => self::SLUG]);

        $this->assertFalse($result);
        $this->assertArrayHasKey('slug', $model->errors());
    }

    public function testInsertSucceedsWithUniqueData(): void
    {
        $model = new TagModel();

        $id = $model->insert(['name' => self::NAME, 'slug' => self::SLUG], true);

        $this->assertIsNumeric($id);
        $this->seeInDatabase('tags', ['name' => self::NAME, 'slug' => self::SLUG]);
    }
}
