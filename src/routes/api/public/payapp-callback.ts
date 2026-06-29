import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PayApp 결제 완료 콜백 (운영 모드).
 *
 * PayApp 가맹점 설정의 feedbackurl 로 호출됩니다.
 * 결제 성공 시 var1 에 담아 보낸 orderId 의 상태를 in_progress 로 전환합니다.
 *
 * 운영 모드에서만 실효 — mock 모드에서는 호출되지 않습니다.
 */
export const Route = createFileRoute("/api/public/payapp-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const text = await request.text();
        const params = new URLSearchParams(text);

        const payState = params.get("pay_state"); // "4" = 결제 완료
        const orderId = params.get("var1");
        const linkkey = params.get("linkkey");

        if (!orderId) {
          return new Response("missing var1", { status: 400 });
        }
        // PayApp linkkey 검증
        if (process.env.PAYAPP_LINKKEY && linkkey !== process.env.PAYAPP_LINKKEY) {
          return new Response("invalid linkkey", { status: 401 });
        }
        if (payState !== "4") {
          // 결제 완료 외 상태는 무시 (요청/취소 등)
          return new Response("ignored");
        }

        const { data: order, error: selErr } = await supabaseAdmin
          .from("orders")
          .select("id, status")
          .eq("id", orderId)
          .maybeSingle();
        if (selErr || !order) {
          return new Response("order not found", { status: 404 });
        }
        if (order.status === "payment_pending") {
          const { error } = await supabaseAdmin
            .from("orders")
            .update({ status: "in_progress" })
            .eq("id", orderId);
          if (error) {
            return new Response(`update failed: ${error.message}`, { status: 500 });
          }
        }
        return new Response("OK");
      },
    },
  },
});
