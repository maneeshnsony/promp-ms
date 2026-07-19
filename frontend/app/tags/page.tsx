import { EntityManager } from "@/components/entity-manager";
import { getTags } from "@/lib/api";
import { createTagAction, deleteTagAction, updateTagAction } from "@/lib/actions";

export default async function TagsPage() {
  const tags = await getTags();

  return (
    <EntityManager
      title="Tags"
      items={tags}
      createAction={createTagAction}
      updateAction={updateTagAction}
      deleteAction={deleteTagAction}
    />
  );
}
