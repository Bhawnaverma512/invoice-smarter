import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TableName = "invoices" | "customers" | "payments" | "products";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

export function SimpleListPage<T extends { id: string }>({
  title,
  table,
  columns,
  order = "created_at",
}: {
  title: string;
  table: TableName;
  columns: Column<T>[];
  order?: string;
}) {
  const { business } = useBusiness();
  const { data, isLoading } = useQuery({
    queryKey: [table, business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("business_id", business!.id)
        .order(order, { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    },
  });

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header}>{c.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>Loading…</TableCell>
              </TableRow>
            ) : !data?.length ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-muted-foreground">
                  Nothing here yet.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((c) => (
                    <TableCell key={c.header}>{c.cell(row)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
