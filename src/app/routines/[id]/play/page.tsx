"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { Routine } from "@/lib/types";
import { getRoutine } from "@/lib/storage";
import { WorkoutPlayer } from "@/components/WorkoutPlayer";

export default function PlayRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [routine, setRoutine] = useState<Routine | null | undefined>(undefined);

  useEffect(() => {
    setRoutine(getRoutine(id) ?? null);
  }, [id]);

  if (routine === undefined) {
    return <div className="page-loading">Cargando…</div>;
  }

  if (!routine) {
    return (
      <div className="page-loading">
        <p>No encontré esa rutina.</p>
        <Link href="/" className="btn-primary">
          Volver
        </Link>
      </div>
    );
  }

  return <WorkoutPlayer routine={routine} />;
}
