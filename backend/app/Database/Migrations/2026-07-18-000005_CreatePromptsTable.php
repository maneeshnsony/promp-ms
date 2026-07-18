<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePromptsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'          => ['type' => 'BIGINT', 'auto_increment' => true],
            'title'       => ['type' => 'VARCHAR', 'constraint' => 255],
            'description' => ['type' => 'TEXT'],
            'notes'       => ['type' => 'TEXT', 'null' => true],
            'is_pinned'   => ['type' => 'BOOLEAN', 'default' => false],
            'copy_count'  => ['type' => 'BIGINT', 'default' => 0],
            'created_by'  => ['type' => 'BIGINT', 'null' => true],
            'created_at'  => ['type' => 'TIMESTAMPTZ', 'null' => true],
            'updated_at'  => ['type' => 'TIMESTAMPTZ', 'null' => true],
            'deleted_at'  => ['type' => 'TIMESTAMPTZ', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('created_by', 'users', 'id', 'CASCADE', 'SET NULL');
        $this->forge->addKey('title', false, false, 'idx_prompts_title');
        $this->forge->createTable('prompts');

        // Partial index — not expressible via Forge's addKey(), so added directly.
        $this->db->query('CREATE INDEX idx_prompts_pinned ON prompts (is_pinned) WHERE is_pinned = TRUE');
    }

    public function down(): void
    {
        $this->forge->dropTable('prompts');
    }
}
