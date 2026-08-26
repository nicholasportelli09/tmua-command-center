"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CourseBoard } from "@/components/course/course-board";

export default function CoursePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Course"
        subtitle="How much of the Clementine Wade TMUA course you've actually completed."
      />
      <CourseBoard />
    </div>
  );
}
