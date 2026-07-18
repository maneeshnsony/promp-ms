<?php

namespace App\Models;

use CodeIgniter\Model;

class RoleModel extends Model
{
    protected $table            = 'roles';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useTimestamps    = true;
    protected $allowedFields    = ['name', 'slug'];

    protected $validationRules = [
        'name' => 'required|is_unique[roles.name,id,{id}]',
        'slug' => 'required|is_unique[roles.slug,id,{id}]',
    ];
}
