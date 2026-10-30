import { createFileRoute } from "@tanstack/react-router";

import { SitePage } from "@/components/site/site-chrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy | Smart Invoice & Follow-Up" }] }),
  component: Privacy,
});

const SECTIONS = [
  ["What we collect", "Account details (name, email), business details you enter, and the invoices, customers and payments you create."],
  ["How we use it", "To run the service: sign you in, store and show your records, and send the reminders you set up."],
  ["Who can see it", "Only the members of your business. Records are protected with database-level access rules."],
  ["Your choices", "You can edit or delete your records, and ask us to delete your account."],
  ["Contact", "Questions about privacy? Use the Contact page."],
] as const;

function Privacy() {
  return (
    <SitePage>
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-20 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
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
