"use client";

import { use } from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import { ReviewScreen } from "@/components/review/review-screen";
import { EmptyState, Panel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useData();
  if (!data) return null;

  const sitting = data.sittings.find((s) => s.id === id);
  if (!sitting) {
    return (
      <Panel>
        <EmptyState
          icon={FileQuestion}
          title="Result not found"
          description="This sitting no longer exists."
          action={
            <Link href="/papers">
              <Button variant="default" size="sm">Back to papers</Button>
            </Link>
          }
        />
      </Panel>
    );
  }
  return <ReviewScreen sitting={sitting} />;
}
