<?php

namespace App\Models;

use CodeIgniter\Database\BaseBuilder;
use CodeIgniter\Model;

class PromptModel extends Model
{
    protected $table            = 'prompts';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = true;
    protected $allowedFields    = ['title', 'description', 'notes', 'is_pinned', 'created_by'];
    protected $useTimestamps    = true;

    protected $validationRules = [
        'title'       => 'required|max_length[255]',
        'description' => 'required',
        'notes'       => 'permit_empty',
    ];

    public function scopeFilters(array $params): BaseBuilder
    {
        $builder = $this->builder();

        if (! empty($params['category'])) {
            $builder->join('prompt_category pc', 'pc.prompt_id = prompts.id')->where('pc.category_id', $params['category']);
        }
        if (! empty($params['tag'])) {
            $builder->join('prompt_tag pt', 'pt.prompt_id = prompts.id')->where('pt.tag_id', $params['tag']);
        }
        if (! empty($params['role'])) {
            $builder->join('prompt_role pr', 'pr.prompt_id = prompts.id')->where('pr.role_id', $params['role']);
        }
        if (! empty($params['pinned'])) {
            $builder->where('is_pinned', true);
        }
        if (! empty($params['search'])) {
            $builder->groupStart()->like('title', $params['search'])->orLike('description', $params['search'])->groupEnd();
        }

        return $builder;
    }
}
