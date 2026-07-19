export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      </div>

      <div className="flex gap-6">
        <div className="hidden w-56 shrink-0 flex-col gap-5 sm:flex">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid flex-1 gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex h-48 flex-col gap-3 rounded-xl border p-4">
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
              <div className="mt-auto h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
