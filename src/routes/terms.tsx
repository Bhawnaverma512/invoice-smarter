import { createFileRoute } from "@tanstack/react-router";

import { SitePage } from "@/components/site/site-chrome";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions | Smart Invoice & Follow-Up" }] }),
  component: Terms,
});

const SECTIONS = [
  ["Using the service", "You are responsible for the accuracy of the invoices, tax rates and customer details you enter."],
  ["Your account", "Keep your sign-in details private. You are responsible for activity on your account."],
  ["Plans and payments", "The Starter plan is free. Paid plans are not billed until a payment gateway is connected."],
  ["Availability", "We work to keep the service available but do not guarantee it will always be uninterrupted."],
  ["Changes", "These terms may be updated. Continued use means you accept the updated terms."],
] as const;

function Terms() {
  return (
    <SitePage>
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-20 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">Terms &amp; Conditions</h1>
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Template text. Have it reviewed and completed for your business and location before you rely on it.
        </p>
        {SECTIONS.map(([t, d]) => (
          <section key={t}>
            <h2 className="mt-4 text-xl font-semibold">{t}</h2>
            <p className="mt-1 text-muted-foreground">{d}</p>
          </section>
        ))}
      </article>
    </SitePage>
  );
}
