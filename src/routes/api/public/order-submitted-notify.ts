import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendResendEmail } from "@/lib/server-email";

const Schema = z.object({
  orderId: z.string().trim().min(1),
});

function splitEmails(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

async function getRecipients() {
  const envEmails = splitEmails(process.env.MISSION_SUBMISSION_NOTIFY_EMAILS);
  if (envEmails.length > 0) return envEmails;

  const fallbackEmail = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  const { data } = await supabaseAdmin.from("admin_emails").select("email");
  const dbEmails = (data ?? []).map((row) => row.email.trim()).filter(Boolean);

  return Array.from(new Set([...(fallbackEmail ? [fallbackEmail] : []), ...dbEmails]));
}

export const Route = createFileRoute("/api/public/order-submitted-notify")({
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

        const { orderId } = parsed.data;
        const { data: order, error: orderError } = await supabaseAdmin
          .from("orders")
          .select("id, email, job_slug, mission_id, submitted_at, status")
          .eq("id", orderId)
          .maybeSingle();

        if (orderError || !order) {
          return new Response("Order not found", { status: 404 });
        }

        if (order.status !== "report_pending") {
          return new Response(JSON.stringify({ ok: true, skipped: true, reason: "status_mismatch" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const recipients = await getRecipients();
        if (recipients.length === 0) {
          return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no_recipient" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        let missionTitle = order.job_slug;
        if (order.mission_id) {
          const { data: mission } = await supabaseAdmin
            .from("missions")
            .select("title")
            .eq("id", order.mission_id)
            .maybeSingle();

          if (mission?.title) {
            missionTitle = mission.title;
          }
        }

        const submittedAt = order.submitted_at
          ? new Date(order.submitted_at).toLocaleString("ko-KR")
          : new Date().toLocaleString("ko-KR");
        const origin = new URL(request.url).origin;
        const adminUrl = `${origin}/admin/feedback`;
        const sampleAnswerUrl = `${origin}/sample-answer/${order.id}`;

        const subject = `[Beginner] 새 미션 제출 알림 - ${missionTitle}`;
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <h2 style="margin-bottom: 16px;">새 미션 제출이 도착했어요</h2>
            <p><strong>시뮬레이션:</strong> ${missionTitle}</p>
            <p><strong>주문 ID:</strong> ${order.id}</p>
            <p><strong>제출자 이메일:</strong> ${order.email || "-"}</p>
            <p><strong>직무 슬러그:</strong> ${order.job_slug}</p>
            <p><strong>제출 시각:</strong> ${submittedAt}</p>
            <p style="margin-top: 20px;">
              <a href="${adminUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#0f766e;color:#ffffff;text-decoration:none;">
                관리자 제출 답변 확인하기
              </a>
            </p>
            <p style="margin-top: 12px;">
              <a href="${sampleAnswerUrl}">${sampleAnswerUrl}</a>
            </p>
          </div>
        `;
        const text = [
          "새 미션 제출이 도착했어요",
          `시뮬레이션: ${missionTitle}`,
          `주문 ID: ${order.id}`,
          `제출자 이메일: ${order.email || "-"}`,
          `직무 슬러그: ${order.job_slug}`,
          `제출 시각: ${submittedAt}`,
          `관리자 페이지: ${adminUrl}`,
          `샘플 답안 페이지: ${sampleAnswerUrl}`,
        ].join("\n");

        try {
          const result = await sendResendEmail({
            to: recipients,
            subject,
            html,
            text,
          });

          return new Response(JSON.stringify({ ok: true, skipped: result.skipped }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("[email] order submission notify failed", error);
          return new Response("Email send failed", { status: 500 });
        }
      },
    },
  },
});
