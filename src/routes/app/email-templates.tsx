import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mail, RotateCcw, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { buildTemplateVars, renderTemplate } from "@/lib/email-render";
import { addDaysISO, todayISO } from "@/lib/format";
import { DEFAULT_TEMPLATES } from "@/lib/reminder-templates";

export const Route = createFileRoute("/app/email-templates")({ component: EmailTemplates });

// Order shown in the list; the labels come from the built-in defaults.
const ORDER = [
  "new_invoice",
  "friendly_reminder",
  "due_today",
  "overdue_notice",
  "payment_confirmation",
  "thank_you",
  "manual_followup",
] as const;

const VARIABLES = [
  ["customer_name", "Customer name"],
  ["invoice_number", "Invoice number"],
  ["amount_due", "Amount due"],
  ["due_date", "Due date"],
  ["days_overdue", "Days overdue"],
  ["business_name", "Business name"],
] as const;

function EmailTemplates() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [key, setKey] = useState<string>(ORDER[0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["email_templates", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").eq("business_id", business!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const row = saved.find((t) => t.template_key === key);
  const def = DEFAULT_TEMPLATES[key]!;
  const effective = { subject: row?.subject ?? def.subject, body: row?.body ?? def.body };
  const enabled = row?.enabled ?? true;
  const dirty = subject !== effective.subject || body !== effective.body;

  // Load the chosen template into the editor (when switching templates or after a save).
  useEffect(() => {
    setSubject(effective.subject);
    setBody(effective.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, row?.id, row?.subject, row?.body]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["email_templates", business?.id] });

  const save = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !body.trim()) throw new Error("Subject and message can't be empty");
      if (row) {
        const { error } = await supabase.from("email_templates").update({ subject, body }).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_templates")
          .insert({ business_id: business!.id, template_key: key, subject, body, enabled: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Template saved");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: async () => {
      if (row) {
        const { error } = await supabase.from("email_templates").delete().eq("id", row.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setSubject(def.subject);
      setBody(def.body);
      toast.success("Restored the default wording");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (on: boolean) => {
      if (row) {
        const { error } = await supabase.from("email_templates").update({ enabled: on }).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_templates")
          .insert({ business_id: business!.id, template_key: key, subject: def.subject, body: def.body, enabled: on });
        if (error) throw error;
      }
    },
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  function insertVar(name: string) {
    const el = bodyRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const sample = buildTemplateVars({
    customerName: "Acme Studios",
    invoiceNumber: "INV-1042",
    amountDue: 32500,
    dueDate: addDaysISO(todayISO(), 3),
    businessName: business?.name ?? "Your business",
    currency: business?.currency ?? "USD",
    paymentLink: "",
  });
  const previewVars = { ...sample, days_overdue: "5" };
  const preview = {
    subject: renderTemplate(subject, previewVars),
    body: renderTemplate(body, previewVars),
  };
  const unknown = [...(subject + body).matchAll(/\{\{(\w+)\}\}/g)]
    .map((m) => m[1]!)
    .filter((v) => !VARIABLES.some(([n]) => n === v) && v !== "payment_link");

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <p className="text-sm text-muted-foreground">
          Edit the wording used for invoices and reminders. Placeholders like {"{{customer_name}}"} are filled in automatically.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-2">
          {isLoading ? (
            <Skeleton className="m-2 h-40" />
          ) : (
            <ul>
              {ORDER.map((k) => {
                const r = saved.find((t) => t.template_key === k);
                const active = k === key;
                return (
                  <li key={k}>
                    <button
                      onClick={() => setKey(k)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${
                        active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{DEFAULT_TEMPLATES[k]!.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {r ? "Customised" : "Default"}
                          {r && !r.enabled ? " · off" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{def.label}</h2>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{enabled ? "On" : "Off"}</span>
                <Switch checked={enabled} onCheckedChange={(on) => toggle.mutate(on)} disabled={toggle.isPending} aria-label="Enable template" />
              </label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input id="tpl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-body">Message</Label>
              <Textarea id="tpl-body" ref={bodyRef} rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Insert placeholder</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {VARIABLES.map(([name, label]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => insertVar(name)}
                    className="rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {unknown.length > 0 && (
              <p className="text-xs text-warning">
                Unknown placeholder{unknown.length > 1 ? "s" : ""}: {unknown.map((u) => `{{${u}}}`).join(", ")}. They’ll be left as typed.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
                <Save className="mr-1 h-4 w-4" /> Save template
              </Button>
              <Button variant="outline" onClick={() => reset.mutate()} disabled={(!row && !dirty) || reset.isPending}>
                <RotateCcw className="mr-1 h-4 w-4" /> Reset to default
              </Button>
            </div>
          </Card>

          <Card className="h-fit p-5">
            <h2 className="font-semibold">Preview</h2>
            <p className="text-xs text-muted-foreground">Shown with sample customer data.</p>
            <div className="mt-4 rounded-xl border bg-muted/40 p-4">
              <div className="text-xs text-muted-foreground">Subject</div>
              <div className="font-medium">{preview.subject || "—"}</div>
              <div className="my-3 border-t" />
              <div className="whitespace-pre-wrap text-sm">{preview.body || "—"}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
