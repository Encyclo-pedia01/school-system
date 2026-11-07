"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { generateInstitutionInsights, updateInsightStatus } from "@/app/actions/insights";

export function InsightStatusButtons({ insightId }: { insightId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(status: "actioned" | "dismissed") {
    startTransition(async () => {
      const result = await updateInsightStatus({ insightId, status });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} onClick={() => update("actioned")} className="rounded-md bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
        {pending ? <LoaderCircle className="inline animate-spin" size={13} aria-hidden="true" /> : null} Actioned
      </button>
      <button type="button" disabled={pending} onClick={() => update("dismissed")} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
        Dismiss
      </button>
    </div>
  );
}

export function InsightRefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const result = await generateInstitutionInsights();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <button type="button" onClick={refresh} disabled={pending} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
      {pending ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
      {pending ? "Checking…" : "Check for new insights"}
    </button>
  );
}
