import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address: kept so existing links and bookmarks still work.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
});
