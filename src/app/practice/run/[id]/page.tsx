"use client";

import { use } from "react";
import Link from "next/link";
import { useData } from "@/lib/state/data-provider";
import { PracticeRunner } from "@/components/practice/practice-runner";
import { EmptyState, Panel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useData();
  if (!data) return null;

  const material = data.materials.find((m) => m.id === id);
  if (!material) {
    return (
      <Panel>
        <EmptyState
          icon={FileQuestion}
          title="Material not found"
          description="This practice PDF no longer exists."
          action={
            <Link href="/practice">
              <Button variant="default" size="sm">Back to practice</Button>
            </Link>
          }
        />
      </Panel>
    );
  }
  return <PracticeRunner material={material} />;
}
