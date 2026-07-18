<?php

namespace App\Models;

use CodeIgniter\Model;

class CategoryModel extends Model
{
    protected $table            = 'categories';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useTimestamps    = true;
    protected $allowedFields    = ['name', 'slug', 'icon', 'color'];

    protected $validationRules = [
        'name' => 'required|is_unique[categories.name,id,{id}]',
        'slug' => 'required|is_unique[categories.slug,id,{id}]',
    ];
}
