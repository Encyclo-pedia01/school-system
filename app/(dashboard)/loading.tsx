export default function DashboardLoading() {
  return (
    <main aria-busy="true" aria-label="Loading school records" className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="h-8 w-56 rounded bg-slate-200" />
      <div className="h-4 w-80 max-w-full rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-28 rounded-xl border border-slate-200 bg-white" />)}
      </div>
      <div className="h-64 rounded-xl border border-slate-200 bg-white" />
      <span className="sr-only">Loading…</span>
    </main>
  );
}
