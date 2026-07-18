<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateTagsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'         => ['type' => 'BIGINT', 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 100],
            'slug'       => ['type' => 'VARCHAR', 'constraint' => 120],
            'created_at' => ['type' => 'TIMESTAMPTZ', 'null' => true],
            'updated_at' => ['type' => 'TIMESTAMPTZ', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('name', 'uq_tags_name');
        $this->forge->addUniqueKey('slug', 'uq_tags_slug');
        $this->forge->createTable('tags');
    }

    public function down(): void
    {
        $this->forge->dropTable('tags');
    }
}
