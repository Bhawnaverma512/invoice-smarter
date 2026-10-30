import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, FileText, Menu, Phone, X } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BRAND, BRAND_BLURB, FOOTER_LINKS, SOCIAL_LINKS, voiceAgentPhone } from "@/lib/site-content";
import { useSignedIn } from "@/lib/use-session";

const NAV: { label: string; to: "/" | "/about" | "/contact"; hash?: string }[] = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/", hash: "features" },
  { label: "How It Works", to: "/", hash: "how-it-works" },
  { label: "Pricing", to: "/", hash: "pricing" },
  { label: "About Us", to: "/about" },
  { label: "Contact", to: "/contact" },
];

/** Extra sections of the home page, shown under the "More" menu. */
const MORE: { label: string; hash: string }[] = [
  { label: "Invoice Details", hash: "invoice-details" },
  { label: "Dashboard Preview", hash: "dashboard-preview" },
  { label: "Testimonials", hash: "testimonials" },
  { label: "FAQ", hash: "faq" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`} aria-label={`${BRAND} home`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <FileText className="h-5 w-5" />
      </span>
      <span className="whitespace-nowrap text-[15px] font-bold leading-tight tracking-tight sm:text-base">{BRAND}</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { signedIn } = useSignedIn();
  const phone = voiceAgentPhone();
  const linkClass = "whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-primary";

  // Everything in the "More" menu, as plain links for the phone menu.
  const moreLinks = (
    <>
      {MORE.map((m) => (
        <Link key={m.label} to="/" hash={m.hash} onClick={() => setOpen(false)} className={linkClass}>
          {m.label}
        </Link>
      ))}
      {phone && (
        <a href={phone.href} className={linkClass}>
          Call voice agent: {phone.label}
        </a>
      )}
    </>
  );

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger className={`${linkClass} flex items-center gap-1 outline-none focus-visible:text-primary`}>
        More <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {MORE.map((m) => (
          <DropdownMenuItem key={m.label} asChild>
            <Link to="/" hash={m.hash} className="cursor-pointer">
              {m.label}
            </Link>
          </DropdownMenuItem>
        ))}
        {phone && (
          <DropdownMenuItem asChild>
            <a href={phone.href} className="cursor-pointer font-medium text-primary">
              <Phone className="mr-2 h-4 w-4" /> {phone.label}
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const links = NAV.map((n) => (
    <Link
      key={n.label}
      to={n.to}
      {...(n.hash ? { hash: n.hash } : {})}
      onClick={() => setOpen(false)}
      className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      {n.label}
    </Link>
  ));

  const actions = signedIn ? (
    <Link
      to="/app/dashboard"
      className="whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
    >
      Go to Dashboard
    </Link>
  ) : (
    <>
      <Link to="/login" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent">
        Login
      </Link>
      <Link
        to="/signup"
        className="whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
      >
        Get Started Free
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 xl:flex" aria-label="Main">
          {links}
          {moreMenu}
        </nav>
        <div className="hidden items-center gap-2 xl:flex">{actions}</div>
        <button
          className="rounded-md p-2 hover:bg-accent xl:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-white px-4 py-4 xl:hidden">
          <nav className="flex flex-col gap-4" aria-label="Mobile">
            {links}
            <div className="border-t pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">More</div>
            {moreLinks}
          </nav>
          <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const socials = SOCIAL_LINKS.filter((s) => s.href);
  const phone = voiceAgentPhone();
  const col = (title: string, items: readonly { label: string; to: string }[]) => (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.label}>
            <Link to={i.to} className="hover:text-primary">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">{BRAND_BLURB}</p>
          {phone && (
            <a href={phone.href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              <Phone className="h-4 w-4" /> Voice agent: {phone.label}
            </a>
          )}
          {socials.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3 text-sm">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {col("Product", FOOTER_LINKS.product)}
        {col("Company", FOOTER_LINKS.company)}
        {col("Legal", FOOTER_LINKS.legal)}
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {BRAND}. All rights reserved.
      </div>
    </footer>
  );
}

/** Header + footer around a public page. */
export function SitePage({ children }: { children: ReactNode }) {
  const hash = useRouterState({ select: (r) => r.location.hash });
  // Scroll to #section links (including when the page is opened directly on one).
  useEffect(() => {
    const id = (hash || window.location.hash).replace(/^#/, "");
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
