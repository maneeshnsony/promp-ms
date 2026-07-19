import { EntityManager } from "@/components/entity-manager";
import { getCategories } from "@/lib/api";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/lib/actions";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <EntityManager
      title="Categories"
      items={categories}
      supportsColor
      createAction={createCategoryAction}
      updateAction={updateCategoryAction}
      deleteAction={deleteCategoryAction}
    />
  );
}
