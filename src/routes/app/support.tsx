import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, Mail, Rocket, Wrench } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/app/support")({ component: Help });

// Change this to your real support inbox.
const SUPPORT_EMAIL = "support@ledgerly.app";

const gettingStarted = [
  { title: "Add your first customer", body: "Open Customers and click Add customer.", to: "/app/customers" },
  { title: "Create an invoice", body: "Choose a customer, add line items, tax and discount, then save.", to: "/app/create-invoice" },
  { title: "Record a payment", body: "Open Payments and log money received against an invoice.", to: "/app/payments" },
  { title: "Turn on reminders", body: "Add follow-up rules so polite reminders go out on their own.", to: "/app/automation" },
] as const;

const faqs = [
  { q: "How do overdue invoices get detected?", a: "An invoice that is sent or partially paid and past its due date is shown as Overdue automatically. You don’t have to change its status." },
  { q: "Can I stop reminders for one invoice?", a: "Yes. Open Reminders (Follow-up Center) and pause reminders or snooze that invoice. Paid invoices stop receiving reminders." },
  { q: "How are totals calculated?", a: "Each line is quantity × unit price plus its tax. The discount is applied before the invoice-level tax, and the grand total is shown on the invoice." },
  { q: "Can I change the reminder wording?", a: "Yes. Edit the wording under Email Templates; rules in Follow-Up Automation decide when each template is used." },
  { q: "Can I use more than one business?", a: "The business selector in the top bar switches between businesses you belong to." },
];

const troubleshooting = [
  { q: "I can’t sign in", a: "Check the email and password, or use Forgot password on the sign-in page. New accounts may need the confirmation email opened first." },
  { q: "My dashboard is empty", a: "Dashboard figures come from your invoices and payments. Add customers and invoices, or load the demo data during first setup." },
  { q: "A reminder didn’t send", a: "Check that the rule is switched on in Follow-Up Automation, the invoice isn’t paused or paid, and the customer has an email address." },
];

function Help() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Help &amp; Support</h1>
        <p className="text-sm text-muted-foreground">Guides, answers and a way to reach us.</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Getting started</h2>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {gettingStarted.map((s, i) => (
            <li key={s.title}>
              <Link to={s.to} className="flex gap-3 rounded-xl border p-4 transition-colors hover:bg-accent">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm">
                  <span className="block font-medium">{s.title}</span>
                  <span className="text-muted-foreground">{s.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">FAQs</h2>
          </div>
          <Accordion type="single" collapsible className="mt-2">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Troubleshooting</h2>
          </div>
          <Accordion type="single" collapsible className="mt-2">
            {troubleshooting.map((f, i) => (
              <AccordionItem key={f.q} value={`t-${i}`}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 bg-accent/50 p-5">
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-8 w-8 text-primary" />
          <div>
            <h2 className="font-semibold">Still need help?</h2>
            <p className="text-sm text-muted-foreground">Email us and we’ll get back to you.</p>
          </div>
        </div>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Smart%20Invoice%20support`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Mail className="h-4 w-4" /> Contact support
        </a>
      </Card>
    </div>
  );
}
