"use client";

import { useTransition } from "react";
import { TrashIcon } from "./icons";

export function DeleteButton({ onDelete, label }: { onDelete: () => Promise<void>; label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={`Delete ${label}`}
      disabled={pending}
      className="rounded-lg p-2 text-muted hover:text-danger disabled:opacity-40"
      onClick={() => {
        if (confirm(`Delete ${label}?`)) startTransition(() => onDelete());
      }}
    >
      <TrashIcon width={18} height={18} />
    </button>
  );
}
