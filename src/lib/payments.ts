import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * 결제 모드
 * - "mock"   : 개발 / 테스트용. 실제 결제 없이 "테스트 결제 성공" 버튼으로 권한 부여.
 * - "payapp" : 운영. PayApp 결제창으로 이동, 콜백(/api/public/payapp-callback)에서 확정.
 *
 * 실서비스 전환 시 .env 의 VITE_PAYMENT_MODE 를 "payapp" 으로 변경.
 */
export const PAYMENT_MODE: "mock" | "payapp" =
  (import.meta.env.VITE_PAYMENT_MODE as "mock" | "payapp") ?? "mock";

export const isMockPayment = () => PAYMENT_MODE === "mock";

/**
 * 결제 완료 처리 (mock 모드 클라이언트 진입점).
 * payment_pending → in_progress 로 전환하여 시뮬레이션/요약 잠금 해제.
 * RLS 로 본인 주문만 업데이트 가능. 운영 모드에서는 콜백 라우트에서 동일 로직을 수행합니다.
 */
export async function confirmPaymentClient(orderId: string) {
  const { data: row, error: selErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!row) throw new Error("주문을 찾을 수 없습니다");
  if (row.status !== "payment_pending") return { ok: true, alreadyPaid: true };
  const { error } = await supabase
    .from("orders")
    .update({ status: "in_progress" })
    .eq("id", orderId);
  if (error) throw error;
  return { ok: true, alreadyPaid: false };
}

/**
 * PayApp 결제창 URL 생성 (운영 모드).
 * 실제 PayApp API 연동은 secrets(PAYAPP_USERID/LINKKEY/LINKVAL) 설정 후 활성화됨.
 */
export const createPayappCheckoutFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string().min(1).max(64),
      productName: z.string().min(1).max(120),
      price: z.number().int().min(100).max(10_000_000),
    }),
  )
  .handler(async ({ data }) => {
    const userid = process.env.PAYAPP_USERID;
    const linkkey = process.env.PAYAPP_LINKKEY;
    const linkval = process.env.PAYAPP_LINKVAL;
    if (!userid || !linkkey || !linkval) {
      throw new Error(
        "PayApp 결제가 설정되지 않았습니다. 관리자에게 문의해주세요.",
      );
    }
    const origin =
      process.env.PUBLIC_SITE_URL ?? "https://job-insight-quest.lovable.app";

    const body = new URLSearchParams({
      cmd: "payrequest",
      userid,
      shopname: "beginner",
      goodname: data.productName,
      price: String(data.price),
      recvphone: "0000000000", // 자동결제(API)용 더미
      smsuse: "n",
      checkretry: "n",
      var1: data.orderId, // 콜백에서 주문 식별
      feedbackurl: `${origin}/api/public/payapp-callback`,
      returnurl: `${origin}/my`,
      reqaddr: "n",
      redirectpay: "1",
    });

    const res = await fetch("https://api.payapp.kr/oapi/apiLoad.html", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${linkkey}:${linkval}`)}`,
      },
      body,
    });
    const text = await res.text();
    const params = new URLSearchParams(text);
    const state = params.get("state");
    const payurl = params.get("payurl");
    if (state !== "1" || !payurl) {
      throw new Error(`PayApp 결제 요청 실패: ${params.get("errorMessage") ?? text}`);
    }
    return { payUrl: payurl };
  });
