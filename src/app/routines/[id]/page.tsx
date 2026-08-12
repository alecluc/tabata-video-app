"use client";

import { use } from "react";
import { RoutineEditor } from "@/components/RoutineEditor";

export default function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <RoutineEditor routineId={id} />;
}
