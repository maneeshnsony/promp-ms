<?php

namespace App\Controllers\Api\V1;

use App\Models\CategoryModel;
use CodeIgniter\RESTful\ResourceController;

class CategoryController extends ResourceController
{
    protected $modelName = CategoryModel::class;
    protected $format    = 'json';

    public function index()
    {
        return $this->respond([
            'status' => 'success',
            'data'   => $this->model->findAll(),
        ]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        if (! $this->validateData($data, $this->model->validationRules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $id = $this->model->insert($data, true);

        return $this->respondCreated([
            'status' => 'success',
            'data'   => $this->model->find($id),
        ]);
    }

    public function update($id = null)
    {
        if (! $this->model->find($id)) {
            return $this->failNotFound();
        }

        $data = $this->request->getJSON(true);
        $rules = $this->model->validationRules;
        $rules['name'] = str_replace('{id}', (string) $id, $rules['name']);
        $rules['slug'] = str_replace('{id}', (string) $id, $rules['slug']);
        if (! $this->validateData($data, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $this->model->skipValidation(true)->update($id, $data);

        return $this->respond([
            'status' => 'success',
            'data'   => $this->model->find($id),
        ]);
    }

    public function delete($id = null)
    {
        if (! $this->model->find($id)) {
            return $this->failNotFound();
        }

        $this->model->delete($id);

        return $this->respondDeleted(['status' => 'success', 'data' => null]);
    }
}
