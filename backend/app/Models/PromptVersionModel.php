<?php

namespace App\Models;

use CodeIgniter\Model;

class PromptVersionModel extends Model
{
    protected $table            = 'prompt_versions';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useTimestamps    = false;
    protected $allowedFields    = ['prompt_id', 'title', 'description', 'edited_by'];
}
