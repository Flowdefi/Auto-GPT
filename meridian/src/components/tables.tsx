import Link from "next/link";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<{ key: string; href?: string; cells: ReactNode[] }>;
}) {
  return (
    <div className="momentum-scroll overflow-x-auto rounded-xl border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header) => (
              <TableHead key={header} className="whitespace-nowrap text-xs uppercase tracking-wide">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              {row.cells.map((cell, index) => (
                <TableCell key={index} className="align-middle">
                  {index === 0 && row.href ? (
                    <Link href={row.href} className="font-medium hover:underline">
                      {cell}
                    </Link>
                  ) : (
                    cell
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
                "mt-1.5 size-2.5 rounded-full",
                index === 0 ? "bg-[var(--brand)]" : "bg-border",
              )}
            />
            <div className="w-px flex-1 bg-border" />
          </div>
          <div className="pb-4">
            <div className="text-sm font-medium">{item.title}</div>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</div>
            <div className="mt-1 text-xs text-muted-foreground/70">{item.meta}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
