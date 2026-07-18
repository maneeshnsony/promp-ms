import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-card-foreground">Prompt Hub</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with your Google account to continue.
        </p>

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
