<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePromptRoleTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'prompt_id' => ['type' => 'BIGINT'],
            'role_id'   => ['type' => 'BIGINT'],
        ]);
        $this->forge->addPrimaryKey(['prompt_id', 'role_id']);
        $this->forge->addForeignKey('prompt_id', 'prompts', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('role_id', 'roles', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addKey('role_id', false, false, 'idx_pr_role_id');
        $this->forge->createTable('prompt_role');
    }

    public function down(): void
    {
        $this->forge->dropTable('prompt_role');
    }
}
