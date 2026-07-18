<?php

use App\Models\PromptModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;

/**
 * @internal
 */
final class PromptModelTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $DBGroup   = 'tests';
    protected $namespace = null;

    private const TITLE_PREFIX = 'PHPUnit Test PromptModel';

    protected function tearDown(): void
    {
        $this->db->table('prompts')->like('title', self::TITLE_PREFIX)->delete();

        parent::tearDown();
    }

    public function testInsertFailsValidationWithoutTitle(): void
    {
        $model = new PromptModel();

        $result = $model->insert(['description' => 'no title here']);

        $this->assertFalse($result);
        $this->assertArrayHasKey('title', $model->errors());
    }

    public function testInsertFailsValidationWithoutDescription(): void
    {
        $model = new PromptModel();

        $result = $model->insert(['title' => self::TITLE_PREFIX . ' No Description']);

        $this->assertFalse($result);
        $this->assertArrayHasKey('description', $model->errors());
    }

    public function testInsertSucceedsWithValidData(): void
    {
        $model = new PromptModel();

        $id = $model->insert([
            'title'       => self::TITLE_PREFIX . ' Valid',
            'description' => 'A valid description',
        ], true);

        $this->assertIsNumeric($id);
        $this->seeInDatabase('prompts', ['title' => self::TITLE_PREFIX . ' Valid']);
    }

    public function testScopeFiltersAppliesSearchAcrossTitleAndDescription(): void
    {
        $model = new PromptModel();
        $model->insert(['title' => self::TITLE_PREFIX . ' Searchable', 'description' => 'unrelated']);
        $model->insert(['title' => 'Something else', 'description' => self::TITLE_PREFIX . ' Searchable in description']);
        $model->insert(['title' => 'No match here', 'description' => 'no match either']);

        $results = $model->scopeFilters(['search' => self::TITLE_PREFIX . ' Searchable'])
            ->where('deleted_at', null)
            ->get()->getResultArray();

        $this->assertCount(2, $results);
    }

    public function testScopeFiltersAppliesPinnedFlag(): void
    {
        $model = new PromptModel();
        $model->insert(['title' => self::TITLE_PREFIX . ' Pinned', 'description' => 'd', 'is_pinned' => true]);
        $model->insert(['title' => self::TITLE_PREFIX . ' Unpinned', 'description' => 'd', 'is_pinned' => false]);

        $results = $model->scopeFilters(['pinned' => '1', 'search' => self::TITLE_PREFIX])
            ->where('deleted_at', null)
            ->get()->getResultArray();

        $this->assertCount(1, $results);
        $this->assertSame(self::TITLE_PREFIX . ' Pinned', $results[0]['title']);
    }
}
