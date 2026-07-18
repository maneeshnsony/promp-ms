<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePromptCategoryTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'prompt_id'   => ['type' => 'BIGINT'],
            'category_id' => ['type' => 'BIGINT'],
        ]);
        $this->forge->addPrimaryKey(['prompt_id', 'category_id']);
        $this->forge->addForeignKey('prompt_id', 'prompts', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('category_id', 'categories', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addKey('category_id', false, false, 'idx_pc_category_id');
        $this->forge->createTable('prompt_category');
    }

    public function down(): void
    {
        $this->forge->dropTable('prompt_category');
    }
}
