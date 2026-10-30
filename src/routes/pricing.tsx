import { createFileRoute } from "@tanstack/react-router";

import { CtaBand, FaqSection, PricingSection } from "@/components/site/sections";
import { SitePage } from "@/components/site/site-chrome";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing | Smart Invoice & Follow-Up" }] }),
  component: () => (
    <SitePage>
      <PricingSection />
      <FaqSection />
      <CtaBand />
    </SitePage>
  ),
});
