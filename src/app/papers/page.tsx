"use client";

import { Plus } from "lucide-react";
import { useLogPaper } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PaperTracker } from "@/components/papers/paper-tracker";
import { SittingsTable } from "@/components/papers/sittings-table";
import { Button } from "@/components/ui/button";

export default function PapersPage() {
  const { open } = useLogPaper();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Papers"
        subtitle="Track official sittings and every logged result. Preserve unseen papers for real benchmarks."
        right={
          <Button variant="primary" size="sm" onClick={() => open()}>
            <Plus className="h-4 w-4" /> Log paper
          </Button>
        }
      />
      <PaperTracker />
      <SittingsTable />
    </div>
  );
}
