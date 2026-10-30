import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BellRing,
  Building2,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Moon,
  Sun,
  Receipt,
  Settings,
  Users,
  Workflow,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Switch } from "@/components/ui/switch";
import { effectiveStatus, todayISO } from "@/lib/format";

const mainItems = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
  { title: "Invoices", url: "/app/invoices", icon: FileText },
  { title: "Create Invoice", url: "/app/create-invoice", icon: FilePlus2 },
  { title: "Customers", url: "/app/customers", icon: Users },
  { title: "Payments", url: "/app/payments", icon: CreditCard },
  { title: "Reminders", url: "/app/reminders", icon: BellRing, badge: true },
  { title: "Follow-Up Automation", url: "/app/automation", icon: Workflow },
  { title: "Reports & Analytics", url: "/app/reports", icon: BarChart3 },
  { title: "Email Templates", url: "/app/email-templates", icon: Mail },
  { title: "Expenses", url: "/app/expenses", icon: Receipt },
  { title: "Settings", url: "/app/settings", icon: Settings },
  { title: "Help & Support", url: "/app/support", icon: LifeBuoy },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (router) => router.location.pathname });
  const { business } = useBusiness();
  const [needsAttention, setNeedsAttention] = React.useState(0);
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("sv:theme") === "dark";
      setDark(saved);
      document.documentElement.classList.toggle("dark", saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  function toggleTheme(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("sv:theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  }

  const { data: statusRows = [] } = useQuery({
    queryKey: ["sidebar-status", business?.id],
    enabled: !!business,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, status, due_date")
        .eq("business_id", business!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const statusCounts = [
    { label: "Paid", dot: "bg-success", n: statusRows.filter((i) => i.status === "paid").length },
    { label: "Pending", dot: "bg-warning", n: statusRows.filter((i) => ["sent", "partially_paid"].includes(effectiveStatus(i))).length },
    { label: "Overdue", dot: "bg-destructive", n: statusRows.filter((i) => effectiveStatus(i) === "overdue").length },
    { label: "Cancelled", dot: "bg-muted-foreground/50", n: statusRows.filter((i) => i.status === "cancelled").length },
    { label: "Drafts", dot: "bg-foreground", n: statusRows.filter((i) => i.status === "draft").length },
  ];

  React.useEffect(() => {
    if (!business) return;
    const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const channel = supabase
      .channel(`sidebar-${business.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => void refresh())
      .subscribe();
    async function refresh() {
      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business!.id)
        .in("status", ["sent", "partially_paid"])
        .lte("due_date", inThreeDays);
      setNeedsAttention(count ?? 0);
    }
    void refresh();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [business]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pb-4 pt-5">
        <Link to="/app/dashboard" className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <p className="min-w-0 text-[15px] font-bold leading-tight tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Smart Invoice
            <span className="block text-xs font-medium text-muted-foreground">&amp; Follow-Up</span>
          </p>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath.startsWith(item.url)} className="h-11 gap-3 rounded-lg px-3 text-[15px] text-sidebar-foreground/80 data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-primary">
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="!h-5 !w-5" />
                      <span>{item.title}</span>
                      {item.badge && needsAttention > 0 && (
                        <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                          {needsAttention}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Invoices</SidebarGroupLabel>
          <SidebarGroupContent>
            <ul className="space-y-1 px-2 text-sm">
              {statusCounts.map((c) => (
                <li key={c.label} className="flex items-center gap-2 py-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  <span>{c.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{c.n}</span>
                </li>
              ))}
            </ul>
          </SidebarGroupContent>
        </SidebarGroup>
        {business && (
          <div className="mt-auto px-3 py-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent p-2 text-xs text-sidebar-foreground/80">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{business.name}</span>
            </div>
            <p className="px-1 pt-1 text-[10px] text-sidebar-foreground/40">
              {todayISO()}
            </p>
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 border-t px-4 py-3 text-xs group-data-[collapsible=icon]:hidden">
          {dark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          <span>Theme</span>
          <span className="ml-auto text-muted-foreground">{dark ? "Dark" : "Light"}</span>
          <Switch checked={dark} onCheckedChange={toggleTheme} aria-label="Toggle dark theme" />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
