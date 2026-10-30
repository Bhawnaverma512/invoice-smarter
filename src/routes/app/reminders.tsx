import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, CalendarClock, Mail, MessageCircle, Send, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { buildTemplateVars, renderTemplate } from "@/lib/email-render";
import {
  addDaysISO,
  daysBetween,
  effectiveStatus,
  formatDate,
  formatDateTime,
  formatMoney,
  outstandingAmount,
  todayISO,
  type InvoiceRow,
} from "@/lib/format";
import { DEFAULT_TEMPLATES } from "@/lib/reminder-templates";

export const Route = createFileRoute("/app/reminders")({ component: Reminders });

type Inv = InvoiceRow & { customers: { name: string; email: string; phone: string | null } | null };
type Channel = "email" | "whatsapp";
type Group = "overdue" | "today" | "soon";

const GROUP_TEMPLATE: Record<Group, string> = {
  overdue: "overdue_notice",
  today: "due_today",
  soon: "friendly_reminder",
};
const GROUP_META: Record<Group, { title: string; hint: string; dot: string }> = {
  overdue: { title: "Overdue", hint: "Past the due date", dot: "bg-destructive" },
  today: { title: "Due today", hint: "Payment is due today", dot: "bg-warning" },
  soon: { title: "Due soon", hint: "Due within 3 days", dot: "bg-success" },
};

function Reminders() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const currency = business?.currency ?? "USD";
  const money = (n: number) => formatMoney(n, currency);
  const [compose, setCompose] = useState<{ inv: Inv; templateKey: string } | null>(null);
  const [schedule, setSchedule] = useState<Inv | null>(null);

  const { data: invoices = [], isLoading: l1 } = useQuery({
    queryKey: ["reminders-invoices", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customers(name, email, phone)")
        .eq("business_id", business!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Inv[];
    },
  });
  const { data: logs = [], isLoading: l2 } = useQuery({
    queryKey: ["reminders-logs", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_logs")
        .select("*")
        .eq("business_id", business!.id)
        .order("scheduled_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: rules = [] } = useQuery({
    queryKey: ["reminder_rules", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase.from("reminder_rules").select("*").eq("business_id", business!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["email_templates", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").eq("business_id", business!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries();
  const byId = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const today = todayISO();
  const open = invoices.filter((i) => ["sent", "partially_paid"].includes(i.status) && !i.reminder_paused);
  const groups: Record<Group, Inv[]> = {
    overdue: open.filter((i) => effectiveStatus(i) === "overdue").sort((a, b) => a.due_date.localeCompare(b.due_date)),
    today: open.filter((i) => i.due_date === today),
    soon: open.filter((i) => i.due_date > today && daysBetween(today, i.due_date) <= 3).sort((a, b) => a.due_date.localeCompare(b.due_date)),
  };
  const lastSent = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of logs) {
      if (l.status === "sent" && l.sent_at && (!m.get(l.invoice_id) || l.sent_at > m.get(l.invoice_id)!)) m.set(l.invoice_id, l.sent_at);
    }
    return m;
  }, [logs]);
  const queued = logs.filter((l) => l.status === "scheduled").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const history = logs.filter((l) => l.status !== "scheduled");

  const enabledRules = rules.filter((r) => r.enabled).length;
  const toggleAll = useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = await supabase.from("reminder_rules").update({ enabled: on }).eq("business_id", business!.id);
      if (error) throw error;
    },
    onSuccess: (_d, on) => {
      toast.success(on ? "Reminder automation turned on" : "Reminder automation paused");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancelQueued = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminder_logs").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scheduled reminder cancelled");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loading = l1 || l2;
  const totalToFollow = groups.overdue.length + groups.today.length + groups.soon.length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reminders</h1>
          <p className="text-sm text-muted-foreground">Send polite payment reminders by email or WhatsApp and keep a record.</p>
        </div>
        <Card className="flex items-center gap-3 px-4 py-3">
          <BellRing className="h-5 w-5 text-primary" />
          <div className="text-sm">
            <div className="font-medium">Reminder automation</div>
            <div className="text-xs text-muted-foreground">
              {rules.length === 0 ? "No rules yet" : `${enabledRules} of ${rules.length} rules on`}
            </div>
          </div>
          <Switch
            checked={rules.length > 0 && enabledRules > 0}
            disabled={rules.length === 0 || toggleAll.isPending}
            onCheckedChange={(on) => toggleAll.mutate(on)}
            aria-label="Enable reminder automation"
          />
        </Card>
      </div>

      <Tabs defaultValue="follow">
        <TabsList>
          <TabsTrigger value="follow">To follow up ({totalToFollow})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({queued.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="follow" className="space-y-5">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : totalToFollow === 0 ? (
            <Card className="flex flex-col items-center gap-2 p-10 text-center">
              <BellRing className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Nothing needs a reminder right now</p>
              <p className="text-sm text-muted-foreground">Invoices that are overdue, due today or due within 3 days will appear here.</p>
            </Card>
          ) : (
            (Object.keys(groups) as Group[])
              .filter((g) => groups[g].length > 0)
              .map((g) => (
                <Card key={g} className="p-5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${GROUP_META[g].dot}`} />
                    <h2 className="font-semibold">{GROUP_META[g].title}</h2>
                    <span className="text-xs text-muted-foreground">
                      {GROUP_META[g].hint} · {groups[g].length}
                    </span>
                  </div>
                  <ul className="mt-3 divide-y">
                    {groups[g].map((i) => {
                      const late = daysBetween(i.due_date, today);
                      const last = lastSent.get(i.id);
                      return (
                        <li key={i.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                          <div className="min-w-[180px] flex-1">
                            <div className="font-medium">{i.customers?.name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {i.invoice_number} · due {formatDate(i.due_date)}
                              {late > 0 ? ` · ${late} day(s) overdue` : ""}
                            </div>
                            {last && <div className="text-xs text-muted-foreground">Last reminder {formatDateTime(last)}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{money(outstandingAmount(i))}</span>
                            <StatusBadge invoice={i} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setCompose({ inv: i, templateKey: GROUP_TEMPLATE[g] })}>
                              <Send className="mr-1 h-3.5 w-3.5" /> Send reminder
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSchedule(i)}>
                              <CalendarClock className="mr-1 h-3.5 w-3.5" /> Schedule
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="scheduled">
          <Card className="p-5">
            <p className="mb-3 text-xs text-muted-foreground">
              Queued reminders. Automatic delivery needs the background sender to be connected. Until then, open an invoice here and use
              Send reminder on the day.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheduled for</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queued.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No scheduled reminders. Use Schedule on an invoice, or add rules in Follow-Up Automation.
                      </TableCell>
                    </TableRow>
                  ) : (
                    queued.map((l) => {
                      const inv = byId.get(l.invoice_id);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(l.scheduled_at.slice(0, 10))}</TableCell>
                          <TableCell className="font-medium">{inv?.customers?.name ?? "—"}</TableCell>
                          <TableCell>{inv?.invoice_number ?? "—"}</TableCell>
                          <TableCell>{DEFAULT_TEMPLATES[l.template_key ?? ""]?.label ?? l.template_key ?? "—"}</TableCell>
                          <TableCell className="capitalize">{l.channel}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Cancel scheduled reminder"
                              onClick={() => cancelQueued.mutate(l.id)}
                              disabled={cancelQueued.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-5">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No reminders sent yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((l) => {
                      const inv = byId.get(l.invoice_id);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDateTime(l.sent_at ?? l.scheduled_at)}
                          </TableCell>
                          <TableCell className="font-medium">{inv?.customers?.name ?? "—"}</TableCell>
                          <TableCell>{inv?.invoice_number ?? "—"}</TableCell>
                          <TableCell>{DEFAULT_TEMPLATES[l.template_key ?? ""]?.label ?? l.template_key ?? "—"}</TableCell>
                          <TableCell className="capitalize">{l.channel}</TableCell>
                          <TableCell>
                            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium capitalize">{l.status}</span>
                            {l.delivery_status && <div className="mt-0.5 text-xs text-muted-foreground">{l.delivery_status}</div>}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {compose && business && (
        <ComposeDialog
          key={compose.inv.id + compose.templateKey}
          inv={compose.inv}
          initialKey={compose.templateKey}
          businessName={business.name}
          currency={currency}
          templates={templates}
          onClose={() => setCompose(null)}
          onDone={() => {
            setCompose(null);
            void refresh();
          }}
        />
      )}
      {schedule && (
        <ScheduleDialog
          inv={schedule}
          templates={templates}
          onClose={() => setSchedule(null)}
          onDone={() => {
            setSchedule(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

type TemplateRow = { template_key: string; subject: string; body: string; enabled: boolean };

function templateOptions(templates: TemplateRow[]) {
  const keys = new Set([...Object.keys(DEFAULT_TEMPLATES), ...templates.map((t) => t.template_key)]);
  return [...keys].map((k) => ({ key: k, label: DEFAULT_TEMPLATES[k]?.label ?? k }));
}
function templateText(templates: TemplateRow[], key: string) {
  const saved = templates.find((t) => t.template_key === key);
  const d = DEFAULT_TEMPLATES[key];
  return { subject: saved?.subject ?? d?.subject ?? "", body: saved?.body ?? d?.body ?? "" };
}

function ComposeDialog({
  inv,
  initialKey,
  businessName,
  currency,
  templates,
  onClose,
  onDone,
}: {
  inv: Inv;
  initialKey: string;
  businessName: string;
  currency: string;
  templates: TemplateRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [channel, setChannel] = useState<Channel>("email");
  const [key, setKey] = useState(initialKey);
  const vars = buildTemplateVars({
    customerName: inv.customers?.name ?? "there",
    invoiceNumber: inv.invoice_number,
    amountDue: outstandingAmount(inv),
    dueDate: inv.due_date,
    businessName,
    currency,
    paymentLink: "",
  });
  const render = (k: string) => {
    const t = templateText(templates, k);
    return { subject: renderTemplate(t.subject, vars), body: renderTemplate(t.body, vars).replace(/\n{3,}/g, "\n\n") };
  };
  const [subject, setSubject] = useState(() => render(initialKey).subject);
  const [body, setBody] = useState(() => render(initialKey).body);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = render(key);
    setSubject(r.subject);
    setBody(r.body);
    // Re-render only when the template choice changes; edits to the text are the user's own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const phone = (inv.customers?.phone ?? "").replace(/\D/g, "");
  const canSend = channel === "email" ? !!inv.customers?.email : phone.length >= 8;

  async function send() {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("reminder_logs").insert({
        business_id: inv.business_id,
        invoice_id: inv.id,
        template_key: key,
        channel,
        scheduled_at: now,
        sent_at: now,
        status: "sent",
        delivery_status: channel === "email" ? "Opened in email app" : "Opened in WhatsApp",
      });
      if (error) throw error;
      await supabase.from("followup_activities").insert({
        business_id: inv.business_id,
        invoice_id: inv.id,
        type: "email_sent",
        content: `${channel === "email" ? "Email" : "WhatsApp"} reminder: ${subject}`,
      });
      const url =
        channel === "email"
          ? `mailto:${inv.customers!.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
          : `https://wa.me/${phone}?text=${encodeURIComponent(`${subject}\n\n${body}`)}`;
      if (channel === "whatsapp") window.open(url, "_blank", "noopener");
      else window.location.href = url;
      toast.success("Reminder logged. Finish sending in your " + (channel === "email" ? "email app" : "WhatsApp window"));
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send reminder · {inv.invoice_number}</DialogTitle>
          <DialogDescription>
            To {inv.customers?.name} · {formatMoney(outstandingAmount(inv), currency)} outstanding
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </span>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <span className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Message template</Label>
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions(templates).map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rem-subject">Subject</Label>
            <Input id="rem-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rem-body">Message (edit freely)</Label>
            <Textarea id="rem-body" rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {!canSend && (
            <p className="text-sm text-destructive">
              {channel === "email" ? "This customer has no email address." : "This customer has no phone number for WhatsApp."}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            This opens your {channel === "email" ? "email app" : "WhatsApp"} with the message ready and records it in History. You
            still press Send there.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} disabled={busy || !canSend || !subject.trim() || !body.trim()}>
            <Send className="mr-1 h-4 w-4" /> {channel === "email" ? "Open email & log" : "Open WhatsApp & log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({
  inv,
  templates,
  onClose,
  onDone,
}: {
  inv: Inv;
  templates: TemplateRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(() => (inv.due_date > todayISO() ? inv.due_date : addDaysISO(todayISO(), 1)));
  const [key, setKey] = useState(() => (effectiveStatus(inv) === "overdue" ? "overdue_notice" : "friendly_reminder"));
  const [channel, setChannel] = useState<Channel>("email");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (date < todayISO()) {
      toast.error("Pick today or a future date");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("reminder_logs").insert({
        business_id: inv.business_id,
        invoice_id: inv.id,
        template_key: key,
        channel,
        scheduled_at: new Date(`${date}T09:00:00Z`).toISOString(),
        status: "scheduled",
      });
      if (error) throw error;
      toast.success(`Reminder scheduled for ${formatDate(date)}`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule reminder · {inv.invoice_number}</DialogTitle>
          <DialogDescription>{inv.customers?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sch-date">Send on</Label>
            <Input id="sch-date" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions(templates).map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
