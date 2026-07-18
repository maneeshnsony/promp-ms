<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $returnType       = 'array';
    protected $useTimestamps    = false;
    protected $allowedFields    = ['google_sub', 'email', 'name', 'avatar_url', 'last_login_at'];

    public function upsertFromGoogle(object $claims): array
    {
        $existing = $this->where('google_sub', $claims->sub)->first();

        $data = [
            'google_sub'    => $claims->sub,
            'email'         => $claims->email,
            'name'          => $claims->name ?? null,
            'avatar_url'    => $claims->picture ?? null,
            'last_login_at' => date('Y-m-d H:i:sO'),
        ];

        if ($existing) {
            $this->update($existing['id'], $data);

            return $this->find($existing['id']);
        }

        $id = $this->insert($data, true);

        return $this->find($id);
    }
}
