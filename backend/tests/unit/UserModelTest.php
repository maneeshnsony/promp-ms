<?php

use App\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;

/**
 * @internal
 */
final class UserModelTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $DBGroup = 'tests';

    // Run every app migration (not just the default 'Tests\Support' example one)
    // against the isolated `prompt_ms_test` database configured in phpunit.dist.xml
    // — never point this DBGroup at the real `prompt_ms` dev database, since the
    // default $refresh = true regresses all migrations on it first.
    protected $namespace = null;

    private const GOOGLE_SUB = 'phpunit-test-google-sub-12345';

    protected function tearDown(): void
    {
        $this->db->table('users')->where('google_sub', self::GOOGLE_SUB)->delete();

        parent::tearDown();
    }

    public function testUpsertFromGoogleCreatesNewUser(): void
    {
        $model = new UserModel();

        $user = $model->upsertFromGoogle((object) [
            'sub'     => self::GOOGLE_SUB,
            'email'   => 'phpunit-test@example.com',
            'name'    => 'PHPUnit Test',
            'picture' => 'https://example.com/avatar.png',
        ]);

        $this->assertSame(self::GOOGLE_SUB, $user['google_sub']);
        $this->assertSame('phpunit-test@example.com', $user['email']);
        $this->assertSame('PHPUnit Test', $user['name']);
        $this->assertNotNull($user['last_login_at']);

        $this->seeInDatabase('users', [
            'google_sub' => self::GOOGLE_SUB,
            'email'      => 'phpunit-test@example.com',
        ]);
    }

    public function testUpsertFromGoogleUpdatesExistingUserByGoogleSub(): void
    {
        $model = new UserModel();

        $first = $model->upsertFromGoogle((object) [
            'sub'   => self::GOOGLE_SUB,
            'email' => 'phpunit-test@example.com',
            'name'  => 'Original Name',
        ]);

        $second = $model->upsertFromGoogle((object) [
            'sub'   => self::GOOGLE_SUB,
            'email' => 'phpunit-test@example.com',
            'name'  => 'Updated Name',
        ]);

        $this->assertSame($first['id'], $second['id'], 'Same google_sub must update, not duplicate, the row');
        $this->assertSame('Updated Name', $second['name']);

        $this->assertEquals(
            1,
            $this->db->table('users')->where('google_sub', self::GOOGLE_SUB)->countAllResults(),
            'Second call must not have inserted a duplicate row'
        );
    }
}
