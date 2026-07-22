import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listHiringGoals from "./tools/list-hiring-goals";
import listNotifications from "./tools/list-notifications";
import listMyOffers from "./tools/list-my-offers";

// Direct supabase.co host required by mcp-js issuer verification.
// VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "xima-mcp",
  title: "XIMA",
  version: "0.1.0",
  instructions:
    "Tools for the XIMA platform. Callers act as their signed-in XIMA user (RLS-scoped). Use `whoami` to verify connectivity, `list_hiring_goals` for business users, `list_notifications` and `list_my_offers` for candidates.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listHiringGoals, listNotifications, listMyOffers],
});
