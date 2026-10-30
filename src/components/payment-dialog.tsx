import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS, formatMoney, round2, todayISO } from "@/lib/format";
import { recordPayment } from "@/lib/payments";

export function PaymentDialog({
  invoice,
  open,
  onOpenChange,
  onRecorded,
}: {
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    paid_amount: number;
    currency: string;
    status: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: () => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(todayISO());
  const [method, setMethod] = React.useState("bank_transfer");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (invoice && open) {
      setAmount(String(round2(Number(invoice.total) - Number(invoice.paid_amount))));
      setDate(todayISO());
      setMethod("bank_transfer");
      setReference("");
      setNotes("");
    }
  }, [invoice, open]);

  if (!invoice) return null;
  const outstanding = round2(Number(invoice.total) - Number(invoice.paid_amount));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a payment amount greater than zero");
      return;
    }
    setBusy(true);
    try {
      await recordPayment({
        data: {
          invoice_id: invoice.id,
          amount: value,
          payment_date: date,
          method,
          reference: reference || null,
          notes: notes || null,
        },
      });
      toast.success(`Payment of ${formatMoney(value, invoice.currency)} recorded`);
      onOpenChange(false);
      onRecorded?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment — {invoice.invoice_number}</DialogTitle>
          <DialogDescription>
            Outstanding balance: {formatMoney(outstanding, invoice.currency)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={outstanding}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">Payment date</Label>
              <Input id="pay-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-ref">Transaction reference (optional)</Label>
            <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-notes">Internal notes (optional)</Label>
            <Textarea id="pay-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
