import { createFileRoute, Link } from "@tanstack/react-router";

import { SitePage } from "@/components/site/site-chrome";
import { BRAND, BRAND_BLURB } from "@/lib/site-content";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About Us | Smart Invoice & Follow-Up" }] }),
  component: About,
});

const POINTS = [
  ["Built for getting paid", "Everything is designed around one outcome: money in your account sooner."],
  ["Made for small teams", "Freelancers, consultants and small agencies can run billing without a finance department."],
  ["Your data stays yours", "Each business can only see its own records, protected at the database level."],
] as const;

function About() {
  return (
    <SitePage>
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">About {BRAND}</h1>
        <p className="mt-5 text-lg text-muted-foreground">{BRAND_BLURB}</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {POINTS.map(([t, d]) => (
            <div key={t} className="rounded-2xl border p-5">
              <h2 className="font-semibold">{t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <Link to="/signup" className="mt-10 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90">
          Get Started Free
        </Link>
      </section>
    </SitePage>
  );
}
