<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;
use CodeIgniter\Database\RawSql;

class CreateUsersTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'            => ['type' => 'BIGINT', 'auto_increment' => true],
            'google_sub'    => ['type' => 'VARCHAR', 'constraint' => 255],
            'email'         => ['type' => 'VARCHAR', 'constraint' => 255],
            'name'          => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'avatar_url'    => ['type' => 'TEXT', 'null' => true],
            'created_at'    => ['type' => 'TIMESTAMPTZ', 'default' => new RawSql('CURRENT_TIMESTAMP')],
            'last_login_at' => ['type' => 'TIMESTAMPTZ', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('google_sub', 'uq_users_google_sub');
        $this->forge->addUniqueKey('email', 'uq_users_email');
        $this->forge->createTable('users');
    }

    public function down(): void
    {
        $this->forge->dropTable('users');
    }
}
