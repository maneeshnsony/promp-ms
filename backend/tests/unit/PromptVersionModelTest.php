<?php

use App\Models\PromptModel;
use App\Models\PromptVersionModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;

/**
 * @internal
 */
final class PromptVersionModelTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $DBGroup   = 'tests';
    protected $namespace = null;

    private const TITLE_PREFIX = 'PHPUnit Test PromptVersionModel';

    private int $promptId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->promptId = (new PromptModel())->insert([
            'title'       => self::TITLE_PREFIX,
            'description' => 'd',
        ], true);
    }

    protected function tearDown(): void
    {
        $this->db->table('prompt_versions')->where('prompt_id', $this->promptId)->delete();
        $this->db->table('prompts')->where('id', $this->promptId)->delete();

        parent::tearDown();
    }

    public function testInsertSucceedsWithRequiredFields(): void
    {
        $model = new PromptVersionModel();

        $id = $model->insert([
            'prompt_id'   => $this->promptId,
            'title'       => self::TITLE_PREFIX . ' v1',
            'description' => 'first snapshot',
            'edited_by'   => null,
        ], true);

        $this->assertIsNumeric($id);
        $this->seeInDatabase('prompt_versions', [
            'prompt_id' => $this->promptId,
            'title'     => self::TITLE_PREFIX . ' v1',
        ]);
    }

    public function testMultipleVersionsForSamePromptAreAllRetrievable(): void
    {
        $model = new PromptVersionModel();

        $model->insert(['prompt_id' => $this->promptId, 'title' => self::TITLE_PREFIX . ' v1', 'description' => 'first']);
        $model->insert(['prompt_id' => $this->promptId, 'title' => self::TITLE_PREFIX . ' v2', 'description' => 'second']);

        $versions = $model->where('prompt_id', $this->promptId)->findAll();

        $this->assertCount(2, $versions);
    }
}
