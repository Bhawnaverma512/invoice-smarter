import * as React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronsUpDown, LogOut, Search, User } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { formatDate, formatMoney } from "@/lib/format";
import { getPrefs } from "@/lib/prefs";

interface NotificationInvoice {
  id: string;
  invoice_number: string;
  due_date: string;
  total: number;
  paid_amount: number;
  currency: string;
  customers: { name: string } | null;
}

export function AppTopbar() {
  const navigate = useNavigate();
  const { business, businesses, setSelectedBusinessId, profile } = useBusiness();
  const [query, setQuery] = React.useState("");
  const [notifications, setNotifications] = React.useState<NotificationInvoice[]>([]);
  const currentPath = useRouterState({ select: (router) => router.location.pathname });
  const [prefs, setPrefsState] = React.useState(getPrefs);
  React.useEffect(() => {
    const sync = () => setPrefsState(getPrefs());
    sync();
    window.addEventListener("ledgerly:prefs", sync);
    return () => window.removeEventListener("ledgerly:prefs", sync);
  }, []);

  React.useEffect(() => {
    if (!business) return;
    if (!prefs.deadlineAlerts) {
      setNotifications([]);
      return;
    }
    const inThreeDays = new Date(Date.now() + prefs.alertDays * 86400000).toISOString().slice(0, 10);
    supabase
      .from("invoices")
      .select("id, invoice_number, due_date, total, paid_amount, currency, customers(name)")
      .eq("business_id", business.id)
      .in("status", ["sent", "partially_paid"])
      .lte("due_date", inThreeDays)
      .order("due_date")
      .limit(8)
      .then(({ data }) => setNotifications((data as NotificationInvoice[]) ?? []));
  }, [business, currentPath, prefs]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  }

  const initials = (profile?.full_name ?? profile?.email ?? "U")
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 no-print">
      <SidebarTrigger />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/app/invoices", search: query.trim() ? { q: query.trim() } : {} });
        }}
        className="relative hidden max-w-md flex-1 sm:block"
      >
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search invoices, customers…"
          className="pl-8"
          aria-label="Search invoices and customers"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-3 py-2 text-sm font-semibold">Payment deadlines</div>
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing due soon. All caught up!
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    to="/app/reminders"
                    className="block border-b px-3 py-2 text-sm last:border-0 hover:bg-muted/50"
                  >
                    <span className="font-medium">{n.invoice_number}</span> · {n.customers?.name}
                    <span className="block text-xs text-muted-foreground">
                      Due {formatDate(n.due_date)} · {formatMoney(Number(n.total) - Number(n.paid_amount), n.currency)} outstanding
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="max-w-[180px] gap-2">
              <span className="truncate">{business?.name ?? "Business"}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Business selector</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {businesses.map((b) => (
              <DropdownMenuItem
                key={b.id}
                onClick={() => setSelectedBusinessId(b.id)}
                className={b.id === business?.id ? "bg-accent" : ""}
              >
                {b.name}
              </DropdownMenuItem>
            ))}
            {businesses.length <= 1 && (
              <DropdownMenuItem disabled>More businesses after invite</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="User menu">
              <span className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate text-sm font-medium md:block">
                  {profile?.full_name ?? profile?.email ?? "Account"}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{profile?.full_name ?? "User"}</div>
              <div className="text-xs font-normal text-muted-foreground">{profile?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
