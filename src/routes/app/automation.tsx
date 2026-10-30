import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  BellOff,
  CheckCircle2,
  Clock,
  FilePlus2,
  Flag,
  GitBranch,
  Hourglass,
  Mail,
  ClipboardList,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReminderRuleRow } from "@/lib/format";
import { DEFAULT_TEMPLATES } from "@/lib/reminder-templates";

export const Route = createFileRoute("/app/automation")({ component: Automation });

type Trigger = "before_due" | "on_due" | "after_due";
type Action = ReminderRuleRow["action"];

const ACTIONS: Record<Action, { label: string; icon: typeof Mail }> = {
  send_email: { label: "Send reminder", icon: Mail },
  create_task: { label: "Create follow-up task", icon: ClipboardList },
  flag_review: { label: "Flag for review", icon: Flag },
};

const PRESET: { trigger_type: Trigger; offset_days: number; action: Action; template_key: string }[] = [
  { trigger_type: "before_due", offset_days: 3, action: "send_email", template_key: "friendly_reminder" },
  { trigger_type: "on_due", offset_days: 0, action: "send_email", template_key: "due_today" },
  { trigger_type: "after_due", offset_days: 2, action: "send_email", template_key: "overdue_notice" },
  { trigger_type: "after_due", offset_days: 7, action: "send_email", template_key: "overdue_notice" },
];

/** Signed days relative to the due date: negative = before, positive = after. */
const when = (r: Pick<ReminderRuleRow, "trigger_type" | "offset_days">) =>
  r.trigger_type === "before_due" ? -r.offset_days : r.trigger_type === "on_due" ? 0 : r.offset_days;

function timing(r: Pick<ReminderRuleRow, "trigger_type" | "offset_days">) {
  if (r.trigger_type === "on_due") return "On the due date";
  const d = `${r.offset_days} day${r.offset_days === 1 ? "" : "s"}`;
  return r.trigger_type === "before_due" ? `${d} before due date` : `${d} after due date`;
}

function Node({
  icon: Icon,
  kind,
  title,
  children,
  tone = "default",
}: {
  icon: typeof Mail;
  kind: string;
  title: string;
  children?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const ring =
    tone === "primary"
      ? "border-primary ring-2 ring-primary/15"
      : tone === "success"
        ? "border-success/50"
        : tone === "warning"
          ? "border-warning/50"
          : "";
  return (
    <div className={`w-full max-w-sm rounded-xl border bg-card p-4 shadow-sm ${ring}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {kind}
      </div>
      <div className="mt-1.5 text-sm font-semibold">{title}</div>
      {children && <div className="mt-1.5 text-xs text-muted-foreground">{children}</div>}
    </div>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="h-4 w-px bg-border" />
      {label && (
        <>
          <span className="rounded-full border bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{label}</span>
          <div className="h-4 w-px bg-border" />
        </>
      )}
    </div>
  );
}

function Step({
  rule,
  index,
  templates,
  onChange,
  onDelete,
}: {
  rule: ReminderRuleRow;
  index: number;
  templates: { key: string; label: string }[];
  onChange: (patch: Partial<Pick<ReminderRuleRow, "trigger_type" | "offset_days" | "action" | "template_key" | "enabled">>) => void;
  onDelete: () => void;
}) {
  const [days, setDays] = useState(String(rule.offset_days));
  useEffect(() => setDays(String(rule.offset_days)), [rule.offset_days]);
  const A = ACTIONS[rule.action];
  const commitDays = () => {
    const n = Math.max(0, Math.floor(Number(days) || 0));
    setDays(String(n));
    if (n !== rule.offset_days) onChange({ offset_days: n });
  };

  return (
    <div className={`w-full max-w-sm rounded-xl border bg-card p-4 shadow-sm ${rule.enabled ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <A.icon className="h-3.5 w-3.5" /> Step {index + 1} · {timing(rule)}
        <span className="ml-auto flex items-center gap-2">
          <Switch checked={rule.enabled} onCheckedChange={(on) => onChange({ enabled: on })} aria-label={`Step ${index + 1} enabled`} />
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label={`Delete step ${index + 1}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_72px] gap-2">
        <Select value={rule.trigger_type} onValueChange={(v) => onChange({ trigger_type: v as Trigger, ...(v === "on_due" ? { offset_days: 0 } : {}) })}>
          <SelectTrigger className="h-9 text-xs" aria-label="When">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="before_due">Before due date</SelectItem>
            <SelectItem value="on_due">On due date</SelectItem>
            <SelectItem value="after_due">After due date</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={0}
          className="h-9 text-xs"
          aria-label="Days"
          value={rule.trigger_type === "on_due" ? "0" : days}
          disabled={rule.trigger_type === "on_due"}
          onChange={(e) => setDays(e.target.value)}
          onBlur={commitDays}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <div className="mt-2 grid gap-2">
        <Select value={rule.action} onValueChange={(v) => onChange({ action: v as Action })}>
          <SelectTrigger className="h-9 text-xs" aria-label="Action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ACTIONS) as Action[]).map((a) => (
              <SelectItem key={a} value={a}>
                {ACTIONS[a].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rule.action === "send_email" && (
          <Select value={rule.template_key ?? "manual_followup"} onValueChange={(v) => onChange({ template_key: v })}>
            <SelectTrigger className="h-9 text-xs" aria-label="Message template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

function Automation() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const key = ["reminder_rules", business?.id];

  const { data: rules = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase.from("reminder_rules").select("*").eq("business_id", business!.id);
      if (error) throw error;
      return (data ?? []).sort((a, b) => when(a) - when(b) || a.created_at.localeCompare(b.created_at));
    },
  });
  const { data: savedTemplates = [] } = useQuery({
    queryKey: ["email_templates", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("template_key").eq("business_id", business!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const templates = [...new Set([...Object.keys(DEFAULT_TEMPLATES), ...savedTemplates.map((t) => t.template_key)])].map((k) => ({
    key: k,
    label: DEFAULT_TEMPLATES[k]?.label ?? k,
  }));

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const fail = (e: Error) => toast.error(e.message);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Parameters<typeof Step>[0]["onChange"] extends (p: infer P) => void ? P : never }) => {
      const { error } = await supabase.from("reminder_rules").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void refresh(),
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminder_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Step removed");
      void refresh();
    },
    onError: fail,
  });
  const add = useMutation({
    mutationFn: async (items: typeof PRESET) => {
      const { error } = await supabase.from("reminder_rules").insert(items.map((i) => ({ ...i, business_id: business!.id, enabled: true })));
      if (error) throw error;
    },
    onSuccess: (_d, items) => {
      toast.success(items.length > 1 ? "Recommended workflow added" : "Step added");
      void refresh();
    },
    onError: fail,
  });
  const toggleAll = useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = await supabase.from("reminder_rules").update({ enabled: on }).eq("business_id", business!.id);
      if (error) throw error;
    },
    onSuccess: (_d, on) => {
      toast.success(on ? "Automation turned on" : "Automation paused");
      void refresh();
    },
    onError: fail,
  });

  const enabledCount = rules.filter((r) => r.enabled).length;
  const terms = business?.default_payment_terms ?? 14;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Follow-Up Automation</h1>
          <p className="text-sm text-muted-foreground">What happens to every invoice, from creation to payment.</p>
        </div>
        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="text-sm">
            <div className="font-medium">Automation</div>
            <div className="text-xs text-muted-foreground">
              {rules.length === 0 ? "No steps yet" : `${enabledCount} of ${rules.length} steps on`}
            </div>
          </div>
          <Switch
            checked={rules.length > 0 && enabledCount > 0}
            disabled={rules.length === 0 || toggleAll.isPending}
            onCheckedChange={(on) => toggleAll.mutate(on)}
            aria-label="Enable automation"
          />
        </Card>
      </div>

      <Card
        className="flex flex-col items-center p-6"
        style={{
          backgroundImage: "radial-gradient(circle, color-mix(in oklch, var(--border) 90%, transparent) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        <Node icon={FilePlus2} kind="Trigger" title="Invoice created" tone="primary">
          You create an invoice, as a draft or ready to send.
        </Node>
        <Connector />
        <Node icon={Send} kind="Action" title="Invoice sent">
          When you send it, it is marked Sent and the reminder steps below are scheduled for that invoice.
        </Node>
        <Connector />
        <Node icon={Hourglass} kind="Wait" title="Wait until due date">
          Due date = invoice date + {terms} day{terms === 1 ? "" : "s"} by default (change it in{" "}
          <Link to="/app/settings" className="text-primary underline">
            Settings
          </Link>
          ).
        </Node>
        <Connector />
        <Node icon={GitBranch} kind="Condition" title="Check payment status">
          Is the invoice fully paid?
        </Node>

        <div className="mt-2 grid w-full max-w-3xl gap-x-6 gap-y-2 md:grid-cols-2">
          <div className="flex flex-col items-center">
            <Connector label="If paid" />
            <Node icon={CheckCircle2} kind="Action" title="Mark invoice as Paid" tone="success">
              Recording payments that cover the total sets the invoice to Paid automatically.
            </Node>
            <Connector />
            <Node icon={BellOff} kind="Action" title="Stop reminders" tone="success">
              Any scheduled reminders for the invoice are cancelled.
            </Node>
          </div>

          <div className="flex flex-col items-center">
            <Connector label="If unpaid" />
            {isLoading ? (
              <Skeleton className="h-40 w-full max-w-sm" />
            ) : rules.length === 0 ? (
              <Node icon={Sparkles} kind="No steps yet" title="Set up follow-ups" tone="warning">
                Start with the recommended workflow, then adjust the timing and wording.
                <Button className="mt-3 w-full" size="sm" onClick={() => add.mutate(PRESET)} disabled={add.isPending}>
                  <Sparkles className="mr-1 h-4 w-4" /> Use recommended workflow
                </Button>
              </Node>
            ) : (
              rules.map((r, i) => {
                const gap = i === 0 ? null : when(r) - when(rules[i - 1]!);
                return (
                  <div key={r.id} className="flex w-full flex-col items-center">
                    {i > 0 && (
                      <>
                        <Connector label={gap && gap > 0 ? `Wait ${gap} day${gap === 1 ? "" : "s"}` : "Same day"} />
                        <div className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground">
                          <Clock className="h-3 w-3" /> Check payment status again
                        </div>
                        <Connector label="If still unpaid" />
                      </>
                    )}
                    <Step
                      rule={r}
                      index={i}
                      templates={templates}
                      onChange={(patch) => update.mutate({ id: r.id, patch })}
                      onDelete={() => remove.mutate(r.id)}
                    />
                  </div>
                );
              })
            )}
            {rules.length > 0 && (
              <>
                <Connector />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => add.mutate([{ trigger_type: "after_due", offset_days: 7, action: "send_email", template_key: "overdue_notice" }])}
                  disabled={add.isPending}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add step
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Message wording for each template is edited under{" "}
        <Link to="/app/email-templates" className="text-primary underline">
          Email Templates
        </Link>
        . Reminders are scheduled when an invoice is sent. Delivery happens from{" "}
        <Link to="/app/reminders" className="text-primary underline">
          Reminders
        </Link>
        , where each message opens in your email app or WhatsApp.
      </p>
    </div>
  );
}
