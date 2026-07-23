export interface User {
  id: number;
  google_sub: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
}

export interface Prompt {
  id: number;
  title: string;
  description: string;
  notes: string | null;
  is_pinned: boolean;
  copy_count: number;
  categories: Category[];
  tags: Tag[];
  roles: Role[];
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
}

export interface PromptFormValues {
  title: string;
  description: string;
  notes?: string;
  is_pinned?: boolean;
  category_ids?: number[];
  tag_ids?: number[];
  role_ids?: number[];
}

export interface PromptVersion {
  id: number;
  title: string;
  description: string;
  edited_at: string;
}

declare module "@auth/core/jwt" {
  interface JWT {
    backendToken?: string;
  }
}
