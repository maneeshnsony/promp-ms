<?php

namespace App\Database\Seeds;

class RoleSeeder extends FacetSeeder
{
    protected string $table = 'roles';

    protected array $names = ['PM', 'Design', 'Docs', 'Marketing', 'Security', 'Ops', 'Data'];
}
