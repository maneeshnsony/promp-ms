<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;
use CodeIgniter\Database\RawSql;

class CreatePromptVersionsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'          => ['type' => 'BIGINT', 'auto_increment' => true],
            'prompt_id'   => ['type' => 'BIGINT'],
            'title'       => ['type' => 'VARCHAR', 'constraint' => 255],
            'description' => ['type' => 'TEXT'],
            'edited_by'   => ['type' => 'BIGINT', 'null' => true],
            'edited_at'   => ['type' => 'TIMESTAMPTZ', 'default' => new RawSql('CURRENT_TIMESTAMP')],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('prompt_id', 'prompts', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('edited_by', 'users', 'id', 'CASCADE', 'SET NULL');
        $this->forge->addKey('prompt_id', false, false, 'idx_prompt_versions_prompt_id');
        $this->forge->createTable('prompt_versions');
    }

    public function down(): void
    {
        $this->forge->dropTable('prompt_versions');
    }
}
