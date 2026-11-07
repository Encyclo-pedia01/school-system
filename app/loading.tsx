import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main id="main-content" className="flex min-h-[50vh] items-center justify-center px-4 py-12">
      <p role="status" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
        <LoaderCircle className="animate-spin text-blue-800" size={18} aria-hidden="true" />
        Loading page…
      </p>
    </main>
  );
}
