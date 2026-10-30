import { createFileRoute } from "@tanstack/react-router";

import { CtaBand, FeaturesSection, HowItWorksSection } from "@/components/site/sections";
import { SitePage } from "@/components/site/site-chrome";

export const Route = createFileRoute("/features")({
  head: () => ({ meta: [{ title: "Features | Smart Invoice & Follow-Up" }] }),
  component: () => (
    <SitePage>
      <FeaturesSection />
      <HowItWorksSection />
      <CtaBand />
    </SitePage>
  ),
});
