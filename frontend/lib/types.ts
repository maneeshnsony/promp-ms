export interface User {
  id: number;
  google_sub: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

declare module "next-auth" {
  interface Session {
    backendToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    backendToken?: string;
  }
}
