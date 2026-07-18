<?php

namespace App\Database\Seeds;

class CategorySeeder extends FacetSeeder
{
    protected string $table = 'categories';

    protected array $names = [
        'Onboard', 'Understand', 'Plan', 'Prototype', 'Build', 'Test',
        'Refactor', 'Review', 'Git', 'Release', 'Debug', 'Data', 'Automate',
    ];
}
