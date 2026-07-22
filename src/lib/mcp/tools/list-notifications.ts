import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_notifications",
  title: "List my notifications",
  description: "List the signed-in user's recent notifications (id, type, message, read, created_at).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 20)."),
    unread_only: z.boolean().optional().describe("Return only unread notifications when true."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, unread_only }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = sb(ctx)
      .from("notifications")
      .select("id, type, message, read, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (unread_only) q = q.eq("read", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { rows: data ?? [] },
    };
  },
});
