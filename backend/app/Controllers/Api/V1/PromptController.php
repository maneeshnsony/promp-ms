<?php

namespace App\Controllers\Api\V1;

use App\Libraries\AuthContext;
use App\Models\PromptModel;
use App\Models\PromptVersionModel;
use CodeIgniter\RESTful\ResourceController;

class PromptController extends ResourceController
{
    protected $modelName = PromptModel::class;
    protected $format    = 'json';

    public function index()
    {
        $params  = $this->request->getGet(['category', 'tag', 'role', 'pinned', 'search', 'page', 'per_page']);
        $page    = max(1, (int) ($params['page'] ?? 1));
        $perPage = min(100, max(1, (int) ($params['per_page'] ?? 20)));

        $builder = $this->model->scopeFilters($params)->where('deleted_at', null);
        $total   = $builder->countAllResults(false);
        $items   = $builder->orderBy('is_pinned', 'DESC')
                            ->orderBy('created_at', 'DESC')
                            ->get($perPage, ($page - 1) * $perPage)
                            ->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data'   => $this->attachRelations($items),
            'meta'   => ['page' => $page, 'per_page' => $perPage, 'total' => $total],
        ]);
    }

    public function show($id = null)
    {
        $prompt = $this->model->find($id);
        if (! $prompt) {
            return $this->failNotFound();
        }

        return $this->respond([
            'status' => 'success',
            'data'   => $this->attachRelations([$prompt])[0],
        ]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        if (! $this->validateData($data, $this->model->validationRules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $data['created_by'] = AuthContext::id();

        $db = db_connect();
        // Query failures inside a transStart()/transComplete() block are swallowed by
        // default (transStatus is just flagged false, nothing throws) — transException(true)
        // makes a failed query throw instead, so a bad id in category_ids/tag_ids/role_ids
        // surfaces as a 500 rather than silently rolling back while still responding 2xx.
        // transStrict(false) matters because $db is a shared, long-lived connection: in
        // strict mode a failed transaction leaves transStatus permanently false, silently
        // rolling back every later transaction on this connection too (not just this request).
        $db->transStrict(false)->transException(true)->transStart();
        try {
            $id = $this->model->insert($data, true);
            $this->syncPivot('prompt_category', (int) $id, 'category_id', $data['category_ids'] ?? []);
            $this->syncPivot('prompt_tag', (int) $id, 'tag_id', $data['tag_ids'] ?? []);
            $this->syncPivot('prompt_role', (int) $id, 'role_id', $data['role_ids'] ?? []);
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }
        $db->transComplete();

        return $this->respondCreated([
            'status' => 'success',
            'data'   => $this->attachRelations([$this->model->find($id)])[0],
        ]);
    }

    public function update($id = null)
    {
        $existing = $this->model->find($id);
        if (! $existing) {
            return $this->failNotFound();
        }

        $data = $this->request->getJSON(true);
        // Partial updates are allowed (see syncPivot's null-means-untouched contract), so
        // only validate the fields actually present in this request's payload. A payload
        // touching only category_ids/tag_ids/role_ids (no title/description/notes) yields
        // an empty $rules here — CI4's Validation::run() treats an empty ruleset as a
        // failure (a guard against forgetting to set rules), so that case must skip
        // validation entirely rather than be misread as invalid input.
        $rules = array_intersect_key($this->model->validationRules, $data);
        if ($rules !== [] && ! $this->validateData($data, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        (new PromptVersionModel())->insert([
            'prompt_id'   => $id,
            'title'       => $existing['title'],
            'description' => $existing['description'],
            'edited_by'   => AuthContext::id(),
        ]);

        // A payload touching only category_ids/tag_ids/role_ids has nothing in
        // $this->model->allowedFields, so calling update() with it would strip down to an
        // empty row and throw DataException::forEmptyDataset() — skip the column update
        // entirely in that case; the pivot syncs below still run regardless.
        // created_by is in allowedFields only so create() can server-set it (see above) —
        // it must never be client-writable on update, or any authenticated user could
        // reassign a prompt's attribution to an arbitrary user id.
        $updatableFields = array_intersect_key($data, array_flip($this->model->allowedFields));
        unset($updatableFields['created_by']);

        $db = db_connect();
        // See create()'s comment on transStrict/transException: without them, a failed query
        // would roll back silently behind a 2xx response, and — since $db is shared and
        // long-lived — could also poison every later transaction on this connection.
        $db->transStrict(false)->transException(true)->transStart();
        try {
            if ($updatableFields !== []) {
                $this->model->skipValidation(true)->update($id, $updatableFields);
            }
            $this->syncPivot('prompt_category', (int) $id, 'category_id', $data['category_ids'] ?? null);
            $this->syncPivot('prompt_tag', (int) $id, 'tag_id', $data['tag_ids'] ?? null);
            $this->syncPivot('prompt_role', (int) $id, 'role_id', $data['role_ids'] ?? null);
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }
        $db->transComplete();

        return $this->respond([
            'status' => 'success',
            'data'   => $this->attachRelations([$this->model->find($id)])[0],
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

    /** Fire-and-forget hit from the frontend's copy button — never blocks the actual clipboard copy. */
    public function trackCopy($id = null)
    {
        if (! $this->model->find($id)) {
            return $this->failNotFound();
        }

        $this->model->builder()->where('id', $id)->increment('copy_count', 1);

        return $this->response->setStatusCode(204);
    }

    public function versions($id = null)
    {
        if (! $this->model->find($id)) {
            return $this->failNotFound();
        }

        $versions = (new PromptVersionModel())->where('prompt_id', $id)->orderBy('edited_at', 'DESC')->findAll();

        return $this->respond(['status' => 'success', 'data' => $versions]);
    }

    /**
     * Shared many-to-many sync helper for category_ids / tag_ids / role_ids. Pass null (not [])
     * to leave a relation untouched on a partial update. Callers must wrap this in a transaction
     * (see create()/update()): it deletes existing rows before re-inserting, so a mid-sync
     * failure (e.g. a stale id violating the pivot table's foreign key) would otherwise leave
     * the delete committed with nothing re-inserted, silently dropping the prompt's associations.
     */
    private function syncPivot(string $table, int $promptId, string $foreignKey, ?array $ids): void
    {
        if ($ids === null) {
            return;
        }
        $db = db_connect();
        $db->table($table)->where('prompt_id', $promptId)->delete();
        if ($ids) {
            $rows = array_map(static fn ($v) => ['prompt_id' => $promptId, $foreignKey => (int) $v], $ids);
            $db->table($table)->insertBatch($rows);
        }
    }

    /** Bulk-fetch categories/tags/roles for these prompt IDs and map them on — one query per relation, not per row. */
    private function attachRelations(array $prompts): array
    {
        $ids = array_column($prompts, 'id');
        if (empty($ids)) {
            return $prompts;
        }

        $db = db_connect();

        $categories = $db->table('prompt_category pc')
            ->select('pc.prompt_id, c.id, c.name, c.slug, c.icon, c.color')
            ->join('categories c', 'c.id = pc.category_id')
            ->whereIn('pc.prompt_id', $ids)
            ->get()->getResultArray();

        $tags = $db->table('prompt_tag pt')
            ->select('pt.prompt_id, t.id, t.name, t.slug')
            ->join('tags t', 't.id = pt.tag_id')
            ->whereIn('pt.prompt_id', $ids)
            ->get()->getResultArray();

        $roles = $db->table('prompt_role pr')
            ->select('pr.prompt_id, r.id, r.name, r.slug')
            ->join('roles r', 'r.id = pr.role_id')
            ->whereIn('pr.prompt_id', $ids)
            ->get()->getResultArray();

        $grouped = static function (array $rows): array {
            $map = [];
            foreach ($rows as $row) {
                $promptId = $row['prompt_id'];
                unset($row['prompt_id']);
                $map[$promptId][] = $row;
            }

            return $map;
        };

        $categoriesByPrompt = $grouped($categories);
        $tagsByPrompt       = $grouped($tags);
        $rolesByPrompt      = $grouped($roles);

        foreach ($prompts as &$prompt) {
            $prompt['categories'] = $categoriesByPrompt[$prompt['id']] ?? [];
            $prompt['tags']       = $tagsByPrompt[$prompt['id']] ?? [];
            $prompt['roles']      = $rolesByPrompt[$prompt['id']] ?? [];
            // pdo_pgsql returns boolean/bigint columns as the strings "t"/"f" and "123", not
            // native JSON types — left as-is, "is_pinned":"f" round-trips as a truthy string
            // in JS. Every prompt response passes through here, so it's the one place to fix it.
            $prompt['is_pinned']  = in_array($prompt['is_pinned'], [true, 't', '1', 1], true);
            $prompt['copy_count'] = (int) $prompt['copy_count'];
        }

        return $prompts;
    }
}
