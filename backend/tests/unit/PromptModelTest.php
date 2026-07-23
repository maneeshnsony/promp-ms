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

    private const TITLE_PREFIX  = 'PHPUnit Test PromptModel';
    private const CATEGORY_SLUG = 'phpunit-promptmodel-category';
    private const TAG_SLUG      = 'phpunit-promptmodel-tag';
    private const ROLE_SLUG     = 'phpunit-promptmodel-role';

    protected function tearDown(): void
    {
        $promptIds = $this->db->table('prompts')->like('title', self::TITLE_PREFIX)->get()->getResultArray();
        foreach ($promptIds as $prompt) {
            $this->db->table('prompt_category')->where('prompt_id', $prompt['id'])->delete();
            $this->db->table('prompt_tag')->where('prompt_id', $prompt['id'])->delete();
            $this->db->table('prompt_role')->where('prompt_id', $prompt['id'])->delete();
        }
        $this->db->table('prompts')->like('title', self::TITLE_PREFIX)->delete();
        $this->db->table('categories')->where('slug', self::CATEGORY_SLUG)->delete();
        $this->db->table('tags')->where('slug', self::TAG_SLUG)->delete();
        $this->db->table('roles')->where('slug', self::ROLE_SLUG)->delete();

        parent::tearDown();
    }

    /** @return array{category: int, tag: int, role: int} */
    private function seedRelations(): array
    {
        $this->db->table('categories')->insert(['name' => self::CATEGORY_SLUG, 'slug' => self::CATEGORY_SLUG]);
        $categoryId = (int) $this->db->insertID();

        $this->db->table('tags')->insert(['name' => self::TAG_SLUG, 'slug' => self::TAG_SLUG]);
        $tagId = (int) $this->db->insertID();

        $this->db->table('roles')->insert(['name' => self::ROLE_SLUG, 'slug' => self::ROLE_SLUG]);
        $roleId = (int) $this->db->insertID();

        return ['category' => $categoryId, 'tag' => $tagId, 'role' => $roleId];
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

    public function testScopeFiltersAppliesCategoryFilter(): void
    {
        $ids   = $this->seedRelations();
        $model = new PromptModel();

        $inId  = $model->insert(['title' => self::TITLE_PREFIX . ' InCategory', 'description' => 'd'], true);
        $outId = $model->insert(['title' => self::TITLE_PREFIX . ' OutOfCategory', 'description' => 'd'], true);
        $this->db->table('prompt_category')->insert(['prompt_id' => $inId, 'category_id' => $ids['category']]);

        $results = $model->scopeFilters(['category' => $ids['category']])
            ->where('deleted_at', null)
            ->get()->getResultArray();

        $this->assertCount(1, $results);
        $this->assertSame((int) $inId, (int) $results[0]['id']);
        $this->assertNotEquals((int) $outId, (int) $results[0]['id']);
    }

    public function testScopeFiltersAppliesTagFilter(): void
    {
        $ids   = $this->seedRelations();
        $model = new PromptModel();

        $inId = $model->insert(['title' => self::TITLE_PREFIX . ' InTag', 'description' => 'd'], true);
        $model->insert(['title' => self::TITLE_PREFIX . ' OutOfTag', 'description' => 'd'], true);
        $this->db->table('prompt_tag')->insert(['prompt_id' => $inId, 'tag_id' => $ids['tag']]);

        $results = $model->scopeFilters(['tag' => $ids['tag']])
            ->where('deleted_at', null)
            ->get()->getResultArray();

        $this->assertCount(1, $results);
        $this->assertSame((int) $inId, (int) $results[0]['id']);
    }

    public function testScopeFiltersAppliesRoleFilter(): void
    {
        $ids   = $this->seedRelations();
        $model = new PromptModel();

        $inId = $model->insert(['title' => self::TITLE_PREFIX . ' InRole', 'description' => 'd'], true);
        $model->insert(['title' => self::TITLE_PREFIX . ' OutOfRole', 'description' => 'd'], true);
        $this->db->table('prompt_role')->insert(['prompt_id' => $inId, 'role_id' => $ids['role']]);

        $results = $model->scopeFilters(['role' => $ids['role']])
            ->where('deleted_at', null)
            ->get()->getResultArray();

        $this->assertCount(1, $results);
        $this->assertSame((int) $inId, (int) $results[0]['id']);
    }

    public function testScopeFiltersCombinesCategoryTagRoleAndSearchWithoutDuplicates(): void
    {
        $ids   = $this->seedRelations();
        $model = new PromptModel();

        $matchId = $model->insert(['title' => self::TITLE_PREFIX . ' AllFacetsMatch', 'description' => 'd'], true);
        $this->db->table('prompt_category')->insert(['prompt_id' => $matchId, 'category_id' => $ids['category']]);
        $this->db->table('prompt_tag')->insert(['prompt_id' => $matchId, 'tag_id' => $ids['tag']]);
        $this->db->table('prompt_role')->insert(['prompt_id' => $matchId, 'role_id' => $ids['role']]);

        // Decoy matches the category and tag but not the role — must be excluded.
        $decoyId = $model->insert(['title' => self::TITLE_PREFIX . ' PartialFacetsMatch', 'description' => 'd'], true);
        $this->db->table('prompt_category')->insert(['prompt_id' => $decoyId, 'category_id' => $ids['category']]);
        $this->db->table('prompt_tag')->insert(['prompt_id' => $decoyId, 'tag_id' => $ids['tag']]);

        $results = $model->scopeFilters([
            'category' => $ids['category'],
            'tag'      => $ids['tag'],
            'role'     => $ids['role'],
            'search'   => self::TITLE_PREFIX,
        ])->where('deleted_at', null)->get()->getResultArray();

        $this->assertCount(1, $results, 'Combined facet filters must not fan out duplicate rows across the three pivot joins');
        $this->assertSame((int) $matchId, (int) $results[0]['id']);
    }
}
