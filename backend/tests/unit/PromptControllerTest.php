<?php

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use Firebase\JWT\JWT;

/**
 * @internal
 */
final class PromptControllerTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $DBGroup   = 'tests';
    protected $namespace = null;

    private const TITLE_PREFIX  = 'PHPUnit Test Prompt';
    private const CATEGORY_SLUG = 'phpunit-test-prompt-category';
    private const TAG_SLUG      = 'phpunit-test-prompt-tag';
    private const ROLE_SLUG     = 'phpunit-test-prompt-role';
    private const GOOGLE_SUB    = 'phpunit-test-prompt-controller-sub';

    private int $userId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->db->table('users')->insert([
            'google_sub' => self::GOOGLE_SUB,
            'email'      => 'phpunit-prompt-controller@example.com',
            'name'       => 'PHPUnit Prompt Controller',
        ]);
        $this->userId = (int) $this->db->insertID();
    }

    protected function tearDown(): void
    {
        $promptIds = $this->db->table('prompts')->like('title', self::TITLE_PREFIX)->get()->getResultArray();
        foreach ($promptIds as $prompt) {
            $this->db->table('prompt_category')->where('prompt_id', $prompt['id'])->delete();
            $this->db->table('prompt_tag')->where('prompt_id', $prompt['id'])->delete();
            $this->db->table('prompt_role')->where('prompt_id', $prompt['id'])->delete();
            $this->db->table('prompt_versions')->where('prompt_id', $prompt['id'])->delete();
        }
        $this->db->table('prompts')->like('title', self::TITLE_PREFIX)->delete();
        $this->db->table('categories')->where('slug', self::CATEGORY_SLUG)->delete();
        $this->db->table('tags')->where('slug', self::TAG_SLUG)->delete();
        $this->db->table('roles')->where('slug', self::ROLE_SLUG)->delete();
        $this->db->table('users')->where('google_sub', self::GOOGLE_SUB)->delete();

        parent::tearDown();
    }

    private function authHeader(): array
    {
        $token = JWT::encode([
            'sub'   => $this->userId,
            'email' => 'phpunit-prompt-controller@example.com',
            'iat'   => time(),
            'exp'   => time() + 3600,
        ], env('APP_JWT_SECRET'), 'HS256');

        return ['Authorization' => 'Bearer ' . $token];
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

    private function insertPrompt(array $overrides = []): int
    {
        $this->db->table('prompts')->insert(array_merge([
            'title'       => self::TITLE_PREFIX,
            'description' => 'desc',
            'created_at'  => date('Y-m-d H:i:sO'),
            'updated_at'  => date('Y-m-d H:i:sO'),
        ], $overrides));

        return (int) $this->db->insertID();
    }

    public function testNoBearerTokenReturns401(): void
    {
        $result = $this->get('api/v1/prompts');

        $result->assertStatus(401);
    }

    public function testCreateValidationFailsWithoutTitle(): void
    {
        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->post('api/v1/prompts', ['description' => 'desc only']);

        $result->assertStatus(400);
    }

    public function testCreatePersistsAndSyncsPivotsAndAttachesRelations(): void
    {
        $ids = $this->seedRelations();

        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->post('api/v1/prompts', [
                'title'        => self::TITLE_PREFIX . ' Create',
                'description'  => 'A description',
                'category_ids' => [$ids['category']],
                'tag_ids'      => [$ids['tag']],
                'role_ids'     => [$ids['role']],
            ]);

        $result->assertStatus(201);
        $body = json_decode($result->getJSON(), true);

        $this->assertSame('success', $body['status']);
        $this->assertCount(1, $body['data']['categories']);
        $this->assertSame(self::CATEGORY_SLUG, $body['data']['categories'][0]['slug']);
        $this->assertCount(1, $body['data']['tags']);
        $this->assertCount(1, $body['data']['roles']);

        $this->seeInDatabase('prompts', ['title' => self::TITLE_PREFIX . ' Create', 'created_by' => $this->userId]);
        $this->seeInDatabase('prompt_category', ['prompt_id' => $body['data']['id'], 'category_id' => $ids['category']]);
    }

    public function testResponseUsesNativeJsonTypesNotPostgresStrings(): void
    {
        // pdo_pgsql returns boolean/bigint columns as the strings "t"/"f" and "123" rather
        // than native types; attachRelations() must cast them back before the JSON response
        // is built, or a client-side `prompt.is_pinned && ...` check treats "f" as truthy.
        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->post('api/v1/prompts', [
                'title'       => self::TITLE_PREFIX . ' Types',
                'description' => 'desc',
            ]);

        $result->assertStatus(201);
        $raw = json_decode($result->getJSON(), true);

        $this->assertSame(false, $raw['data']['is_pinned'], 'is_pinned must serialize as a JSON boolean, not "f"');
        $this->assertSame(0, $raw['data']['copy_count'], 'copy_count must serialize as a JSON number, not a numeric string');
    }

    public function testShowReturns404ForMissingPrompt(): void
    {
        $result = $this->withHeaders($this->authHeader())->get('api/v1/prompts/999999');

        $result->assertStatus(404);
    }

    public function testUpdateSnapshotsPreviousVersionAndLeavesPivotsUntouchedWhenOmitted(): void
    {
        $ids = $this->seedRelations();

        $promptId = $this->insertPrompt(['title' => self::TITLE_PREFIX . ' Update', 'description' => 'Original description']);
        $this->db->table('prompt_category')->insert(['prompt_id' => $promptId, 'category_id' => $ids['category']]);

        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->put('api/v1/prompts/' . $promptId, ['title' => self::TITLE_PREFIX . ' Update (edited)']);

        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);

        $this->assertSame(self::TITLE_PREFIX . ' Update (edited)', $body['data']['title']);
        // category_ids was omitted from the request, so the pivot must remain untouched.
        $this->assertCount(1, $body['data']['categories']);

        $this->seeInDatabase('prompt_versions', [
            'prompt_id'   => $promptId,
            'title'       => self::TITLE_PREFIX . ' Update',
            'description' => 'Original description',
        ]);
    }

    public function testUpdateMissingPromptReturns404(): void
    {
        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->put('api/v1/prompts/999999', ['title' => 'x']);

        $result->assertStatus(404);
    }

    public function testUpdateWithEmptyTitleFailsValidationAndDoesNotSnapshot(): void
    {
        $promptId = $this->insertPrompt(['title' => self::TITLE_PREFIX . ' Empty Title', 'description' => 'Original']);

        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->put('api/v1/prompts/' . $promptId, ['title' => '']);

        $result->assertStatus(400);

        $this->seeInDatabase('prompts', ['id' => $promptId, 'title' => self::TITLE_PREFIX . ' Empty Title']);
        $this->assertSame(
            0,
            $this->db->table('prompt_versions')->where('prompt_id', $promptId)->countAllResults(),
            'A failed validation must not have left a version snapshot behind'
        );
    }

    public function testVersionsReturnsSnapshotHistory(): void
    {
        $promptId = $this->insertPrompt(['title' => self::TITLE_PREFIX . ' Versions', 'description' => 'v1']);

        $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->put('api/v1/prompts/' . $promptId, ['title' => self::TITLE_PREFIX . ' Versions', 'description' => 'v2']);

        $result = $this->withHeaders($this->authHeader())->get('api/v1/prompts/' . $promptId . '/versions');

        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);
        $this->assertCount(1, $body['data']);
        $this->assertSame('v1', $body['data'][0]['description']);
    }

    public function testTrackCopyIncrementsCopyCountAndReturns204(): void
    {
        $promptId = $this->insertPrompt(['title' => self::TITLE_PREFIX . ' Copy', 'copy_count' => 0]);

        $result = $this->withHeaders($this->authHeader())->post('api/v1/prompts/' . $promptId . '/copy');

        $result->assertStatus(204);
        $this->seeInDatabase('prompts', ['id' => $promptId, 'copy_count' => 1]);
    }

    public function testTrackCopyMissingPromptReturns404(): void
    {
        $result = $this->withHeaders($this->authHeader())->post('api/v1/prompts/999999/copy');

        $result->assertStatus(404);
    }

    public function testDeleteSoftDeletesAndExcludesFromIndex(): void
    {
        $promptId = $this->insertPrompt(['title' => self::TITLE_PREFIX . ' Delete']);

        $result = $this->withHeaders($this->authHeader())->delete('api/v1/prompts/' . $promptId);

        $result->assertStatus(200);

        // Row must still physically exist (soft delete), with deleted_at set.
        $row = $this->db->table('prompts')->where('id', $promptId)->get()->getRowArray();
        $this->assertNotNull($row);
        $this->assertNotNull($row['deleted_at']);

        $index = $this->withHeaders($this->authHeader())->get('api/v1/prompts?search=' . self::TITLE_PREFIX . '%20Delete');
        $indexBody = json_decode($index->getJSON(), true);
        $this->assertCount(0, $indexBody['data']);
    }

    public function testIndexOrdersPinnedFirstThenByCreatedAtDesc(): void
    {
        $older = $this->insertPrompt([
            'title'      => self::TITLE_PREFIX . ' Order Older',
            'is_pinned'  => false,
            'created_at' => date('Y-m-d H:i:sO', time() - 100),
        ]);
        $newerUnpinned = $this->insertPrompt([
            'title'     => self::TITLE_PREFIX . ' Order Newer',
            'is_pinned' => false,
        ]);
        $pinnedOlder = $this->insertPrompt([
            'title'      => self::TITLE_PREFIX . ' Order Pinned',
            'is_pinned'  => true,
            'created_at' => date('Y-m-d H:i:sO', time() - 200),
        ]);

        $result = $this->withHeaders($this->authHeader())->get('api/v1/prompts?search=' . self::TITLE_PREFIX . '%20Order&per_page=10');
        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);

        $ids = array_map('intval', array_column($body['data'], 'id'));
        $this->assertSame([$pinnedOlder, $newerUnpinned, $older], $ids);
        $this->assertSame(3, $body['meta']['total']);
    }

    public function testIndexClampsPerPageAboveHundredToOneHundred(): void
    {
        $this->insertPrompt(['title' => self::TITLE_PREFIX . ' PerPageClampHigh']);

        $result = $this->withHeaders($this->authHeader())
            ->get('api/v1/prompts?search=' . self::TITLE_PREFIX . '%20PerPageClampHigh&per_page=500');

        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);
        $this->assertSame(100, $body['meta']['per_page']);
    }

    public function testIndexClampsPerPageAndPageBelowOne(): void
    {
        $this->insertPrompt(['title' => self::TITLE_PREFIX . ' PerPageClampLowA']);
        $this->insertPrompt(['title' => self::TITLE_PREFIX . ' PerPageClampLowB']);

        $result = $this->withHeaders($this->authHeader())
            ->get('api/v1/prompts?search=' . self::TITLE_PREFIX . '%20PerPageClampLow&per_page=0&page=0');

        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);
        $this->assertSame(1, $body['meta']['per_page']);
        $this->assertSame(1, $body['meta']['page']);
        $this->assertCount(1, $body['data'], 'per_page must be floored to 1, so only a single row comes back');
    }

    public function testIndexPageBeyondResultsReturnsEmptyDataWithCorrectMeta(): void
    {
        $this->insertPrompt(['title' => self::TITLE_PREFIX . ' PageBeyondResults']);

        $result = $this->withHeaders($this->authHeader())
            ->get('api/v1/prompts?search=' . self::TITLE_PREFIX . '%20PageBeyondResults&per_page=10&page=999');

        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);
        $this->assertSame([], $body['data']);
        $this->assertSame(1, $body['meta']['total']);
    }

    public function testUpdateWithEmptyCategoryIdsArrayClearsExistingPivot(): void
    {
        $ids = $this->seedRelations();

        $promptId = $this->insertPrompt(['title' => self::TITLE_PREFIX . ' ClearPivot', 'description' => 'Original']);
        $this->db->table('prompt_category')->insert(['prompt_id' => $promptId, 'category_id' => $ids['category']]);

        $result = $this->withHeaders($this->authHeader())
            ->withBodyFormat('json')
            ->put('api/v1/prompts/' . $promptId, ['category_ids' => []]);

        $result->assertStatus(200);
        $body = json_decode($result->getJSON(), true);

        $this->assertSame([], $body['data']['categories']);
        $this->dontSeeInDatabase('prompt_category', ['prompt_id' => $promptId]);
    }
}
