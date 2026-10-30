import { createFileRoute } from "@tanstack/react-router";

import {
  BenefitsSection,
  CtaBand,
  DashboardPreviewSection,
  FaqSection,
  FeaturesSection,
  Hero,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
} from "@/components/site/sections";
import { SitePage } from "@/components/site/site-chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Invoice & Follow-Up: Create Invoices Smarter. Get Paid Faster." },
      {
        name: "description",
        content: "Manage invoices, track payments, and automate customer follow-ups, all from one intelligent platform.",
      },
      { property: "og:title", content: "Smart Invoice & Follow-Up" },
      { property: "og:description", content: "Create invoices smarter. Get paid faster." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <SitePage>
      <Hero />
      <FeaturesSection />
      <HowItWorksSection />
      <DashboardPreviewSection />
      <BenefitsSection />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaBand />
    </SitePage>
  );
}
