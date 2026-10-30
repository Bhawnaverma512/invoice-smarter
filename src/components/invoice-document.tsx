import { createRoot } from "react-dom/client";

import { formatDate, formatMoney } from "@/lib/format";

export interface InvoiceDoc {
  business: {
    name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
    tax_id: string | null;
    payment_instructions: string | null;
    logo_url?: string | null;
  };
  customer: {
    name: string;
    company?: string | null;
    email: string;
    phone?: string | null;
    billing_address?: string | null;
  };
  number: string;
  status: string;
  issue_date: string;
  due_date: string;
  currency: string;
  items: { description: string; quantity: number; unit_price: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  tax_rate: number;
  total: number;
  paid_amount: number;
  notes: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "DRAFT",
  sent: "UNPAID",
  partially_paid: "PARTIALLY PAID",
  paid: "PAID",
  cancelled: "CANCELLED",
  overdue: "OVERDUE",
};

/** A clean, print-ready invoice. Inline colours so it prints the same in light and dark themes. */
export function InvoiceDocument({ doc }: { doc: InvoiceDoc }) {
  const m = (n: number) => formatMoney(n, doc.currency);
  const balance = Math.max(doc.total - doc.paid_amount, 0);
  return (
    <div
      className="mx-auto w-full max-w-3xl rounded-lg bg-white p-8 text-sm"
      style={{ color: "#102A56", fontFamily: "inherit" }}
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          {doc.business.logo_url && (
            <img src={doc.business.logo_url} alt="" className="mb-2 max-h-14 max-w-[180px] object-contain" />
          )}
          <div className="text-2xl font-bold" style={{ color: "#059669" }}>
            {doc.business.name}
          </div>
          <div className="mt-1 whitespace-pre-line" style={{ color: "#64748B" }}>
            {[doc.business.address, doc.business.email, doc.business.phone].filter(Boolean).join("\n")}
          </div>
          {doc.business.tax_id && (
            <div className="mt-1" style={{ color: "#64748B" }}>
              GST / Tax ID: {doc.business.tax_id}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tracking-tight">INVOICE</div>
          <div className="mt-1 font-medium">{doc.number}</div>
          <div
            className="mt-2 inline-block rounded px-2 py-0.5 text-xs font-semibold"
            style={{ background: "#ECFDF5", color: "#047857" }}
          >
            {STATUS_LABEL[doc.status] ?? doc.status.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-semibold uppercase" style={{ color: "#64748B" }}>
            Bill to
          </div>
          <div className="mt-1 font-semibold">{doc.customer.company || doc.customer.name}</div>
          {doc.customer.company && <div>{doc.customer.name}</div>}
          <div className="whitespace-pre-line" style={{ color: "#64748B" }}>
            {[doc.customer.billing_address, doc.customer.email, doc.customer.phone].filter(Boolean).join("\n")}
          </div>
        </div>
        <div className="text-right">
          <div>
            <span style={{ color: "#64748B" }}>Issue date: </span>
            {formatDate(doc.issue_date)}
          </div>
          <div>
            <span style={{ color: "#64748B" }}>Due date: </span>
            {formatDate(doc.due_date)}
          </div>
        </div>
      </div>

      <table className="mt-8 w-full text-left">
        <thead>
          <tr style={{ background: "#F1F5F9", color: "#64748B" }} className="text-xs">
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 text-right font-medium">Qty</th>
            <th className="px-3 py-2 text-right font-medium">Unit price</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
              <td className="px-3 py-3">{it.description}</td>
              <td className="px-3 py-3 text-right">{it.quantity}</td>
              <td className="px-3 py-3 text-right">{m(it.unit_price)}</td>
              <td className="px-3 py-3 text-right">{m(it.quantity * it.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-6 w-full max-w-xs space-y-1.5">
        <Row label="Subtotal" value={m(doc.subtotal)} />
        {doc.discount > 0 && <Row label="Discount" value={`− ${m(doc.discount)}`} />}
        {doc.tax_rate > 0 && <Row label={`Tax / GST (${doc.tax_rate}%)`} value={m(doc.tax)} />}
        <div className="flex justify-between pt-2 text-base font-bold" style={{ borderTop: "2px solid #102A56" }}>
          <span>Total</span>
          <span>{m(doc.total)}</span>
        </div>
        {doc.paid_amount > 0 && <Row label="Paid" value={`− ${m(doc.paid_amount)}`} />}
        {doc.paid_amount > 0 && <Row label="Balance due" value={m(balance)} bold />}
      </div>

      {(doc.notes || doc.business.payment_instructions) && (
        <div className="mt-8 grid gap-4 text-xs sm:grid-cols-2" style={{ color: "#64748B" }}>
          {doc.business.payment_instructions && (
            <div>
              <div className="font-semibold" style={{ color: "#102A56" }}>
                Payment instructions
              </div>
              <div className="whitespace-pre-line">{doc.business.payment_instructions}</div>
            </div>
          )}
          {doc.notes && (
            <div>
              <div className="font-semibold" style={{ color: "#102A56" }}>
                Notes
              </div>
              <div className="whitespace-pre-line">{doc.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span style={{ color: bold ? undefined : "#64748B" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * Print an invoice (or save it as a PDF from the browser's print dialog).
 * The invoice is mounted in its own root; print CSS hides everything else on the page.
 */
export function printInvoice(doc: InvoiceDoc) {
  const host = document.createElement("div");
  host.className = "invoice-print-root";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<InvoiceDocument doc={doc} />);
  document.body.classList.add("printing-invoice");

  const cleanup = () => {
    document.body.classList.remove("printing-invoice");
    root.unmount();
    host.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  // Let React paint the invoice before the print dialog opens.
  setTimeout(() => window.print(), 150);
}
