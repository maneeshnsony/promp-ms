<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Shared shape for the flat facet tables (categories, roles — and tags, if ever
 * pre-seeded): a list of names inserted with framework-canonical slugs, tolerant
 * of re-runs via ON CONFLICT DO NOTHING.
 */
abstract class FacetSeeder extends Seeder
{
    protected string $table;

    /** @var list<string> */
    protected array $names;

    public function run(): void
    {
        helper('url');

        $rows = [];
        foreach ($this->names as $name) {
            $rows[] = [
                'name' => $name,
                'slug' => url_title($name, '-', true),
            ];
        }

        $this->db->table($this->table)->ignore(true)->insertBatch($rows);
    }
}
