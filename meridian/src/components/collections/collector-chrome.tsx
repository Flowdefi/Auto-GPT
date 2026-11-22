"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/meridian/legacy";

export interface Shortcut {
  key: string;
  label: string;
  run: () => void;
}

/** Keyboard help for the collector desk. Shortcuts are ignored while typing in a field. */
export function CollectorChrome({ shortcuts }: { shortcuts: Shortcut[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (event.key === "?" && !typing) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const match = shortcuts.find((item) => item.key.toLowerCase() === event.key.toLowerCase());
      if (!match) return;
      event.preventDefault();
      match.run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts]);

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>Press ? for shortcuts. Dark mode follows the system unless Light or Dark is chosen in the header.</span>
      {open ? (
        <Card className="w-full p-3 text-sm text-foreground">
          <p className="font-semibold">Shortcuts</p>
          <ul className="mt-2 grid gap-1">
            {shortcuts.map((item) => (
              <li key={item.key}><kbd className="rounded border px-1">{item.key}</kbd> {item.label}</li>
            ))}
            <li><kbd className="rounded border px-1">?</kbd> Show or hide this list</li>
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
