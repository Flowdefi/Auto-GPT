import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./ui";

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<{ key: string; href?: string; cells: ReactNode[] }>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-card">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cells = row.cells.map((cell, index) => (
              <td key={index} className="px-4 py-3 align-middle text-ink-800">
                {cell}
              </td>
            ));
            return row.href ? (
              <tr key={row.key} className="border-t border-ink-50 hover:bg-ink-50/70">
                {cells.map((cell, index) =>
                  index === 0 ? (
                    <td key={index} className="px-4 py-3">
                      <Link href={row.href ?? "#"} className="font-medium hover:underline">
                        {row.cells[0]}
                      </Link>
                    </td>
                  ) : (
                    cell
                  ),
                )}
              </tr>
            ) : (
              <tr key={row.key} className="border-t border-ink-50">
                {cells}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: Array<{ id: string; title: string; body: string; meta: string }>;
}) {
  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "mt-1 h-2.5 w-2.5 rounded-full",
                index === 0 ? "bg-[var(--accent)]" : "bg-ink-200",
              )}
            />
            <div className="w-px flex-1 bg-ink-100" />
          </div>
          <div className="pb-4">
            <div className="text-sm font-medium">{item.title}</div>
            <div className="whitespace-pre-wrap text-sm text-ink-600">{item.body}</div>
            <div className="mt-1 text-xs text-ink-400">{item.meta}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
