import { EntityManager } from "@/components/entity-manager";
import { getRoles } from "@/lib/api";
import { createRoleAction, deleteRoleAction, updateRoleAction } from "@/lib/actions";

export default async function RolesPage() {
  const roles = await getRoles();

  return (
    <EntityManager
      title="Roles"
      items={roles}
      createAction={createRoleAction}
      updateAction={updateRoleAction}
      deleteAction={deleteRoleAction}
    />
  );
}
