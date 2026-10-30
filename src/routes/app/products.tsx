import { createFileRoute } from "@tanstack/react-router";

import { SimpleListPage } from "@/components/simple-list-page";
import { formatMoney, type ProductRow } from "@/lib/format";

export const Route = createFileRoute("/app/products")({ component: Page });

function Page() {
  return (
    <SimpleListPage<ProductRow>
      title="Products & Services"
      table="products"
      columns={[
        { header: "Name", cell: (r) => r.name },
        { header: "Unit", cell: (r) => r.unit },
        { header: "Price", cell: (r) => formatMoney(r.unit_price) },
        { header: "Tax", cell: (r) => `${r.tax_rate}%` },
      ]}
    />
  );
}
