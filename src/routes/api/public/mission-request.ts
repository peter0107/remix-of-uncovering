import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  jobName: z.string().trim().min(1).max(80),
  categoryName: z.string().trim().max(80).optional().default(""),
});

export const Route = createFileRoute("/api/public/mission-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return new Response("Invalid input", { status: 400 });
        }
        const { jobName, categoryName } = parsed.data;

        const { error } = await supabaseAdmin.from("mission_requests").insert({
          job_name: jobName,
          category_name: categoryName || null,
        });

        if (error) {
          return new Response("Failed to save", { status: 500 });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
