<?php

namespace App\Models;

use CodeIgniter\Model;

class TagModel extends Model
{
    protected $table            = 'tags';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useTimestamps    = true;
    protected $allowedFields    = ['name', 'slug'];

    protected $validationRules = [
        'name' => 'required|is_unique[tags.name,id,{id}]',
        'slug' => 'required|is_unique[tags.slug,id,{id}]',
    ];
}
