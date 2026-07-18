<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePromptTagTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'prompt_id' => ['type' => 'BIGINT'],
            'tag_id'    => ['type' => 'BIGINT'],
        ]);
        $this->forge->addPrimaryKey(['prompt_id', 'tag_id']);
        $this->forge->addForeignKey('prompt_id', 'prompts', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('tag_id', 'tags', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addKey('tag_id', false, false, 'idx_pt_tag_id');
        $this->forge->createTable('prompt_tag');
    }

    public function down(): void
    {
        $this->forge->dropTable('prompt_tag');
    }
}
