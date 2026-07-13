import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

// ── 커피챗 고정 슬롯 (평일 10:00~16:30 시작, 30분 단위 14개) ──────────
// 상수/타입은 클라이언트 번들에 포함돼도 안전. supabaseAdmin만 핸들러 내부 동적 import.
export const COFFEE_CHAT_SLOT_TIMES = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
  "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
] as const;
export type CoffeeChatSlotTime = (typeof COFFEE_CHAT_SLOT_TIMES)[number];

// 예약 가능 기간: 내일부터 평일 기준 이 일수만큼 앞을 노출/허용
export const COFFEE_CHAT_MAX_AHEAD_DAYS = 60;

// ── 인증/유틸 헬퍼 (simulations.functions.ts에서 복제, ai-chat.functions.ts 선례) ──
function getBearerToken(): string {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("로그인이 필요합니다.");
  }
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }
  return token;
}

function createPublicServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Backend is not configured");
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function assertAdmin() {
  const token = getBearerToken();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) {
    throw new Error("ADMIN_EMAILS 환경변수가 필요합니다.");
  }
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !adminEmails.includes(email)) {
    throw new Error("관리자 권한이 없습니다.");
  }
}

// KST 오늘(YYYY-MM-DD). en-CA 로케일이 ISO 포맷을 준다.
function getKstTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

// 달력 날짜의 요일 (0=일 ... 6=토). UTC 자정 파싱이라 타임존 무관하게 정확.
function isoWeekday(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00Z`).getUTCDay();
}

function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// "2026-07-15 (수) 10:00"
function buildSlotLabel(slotDate: string, slotTime: string): string {
  const weekday = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(`${slotDate}T00:00:00Z`));
  return `${slotDate} (${weekday}) ${slotTime}`;
}

// Cloudflare Turnstile 검증 (봇/스팸 방지). 공개 폼 제출의 남용을 막는다.
// TURNSTILE_SECRET_KEY 미설정 시 Cloudflare 공식 테스트 시크릿(항상 통과)으로 폴백 →
// 운영에서는 반드시 실제 시크릿을 환경변수로 설정해야 실제 보호가 동작한다.
async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
  let outcome: { success?: boolean };
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    outcome = (await res.json()) as { success?: boolean };
  } catch (error) {
    console.error("Failed to verify Turnstile token:", error);
    throw new Error("보안 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!outcome.success) {
    throw new Error("보안 확인에 실패했습니다. 다시 시도해주세요.");
  }
}

// ── zod 공통 조각 ─────────────────────────────────────────────
const nameField = z.string().trim().min(1).max(100);
const emailField = z.string().trim().email().max(200);
const phoneField = z.string().trim().min(9).max(20).regex(/^[\d\-+() ]+$/);
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const serviceApplicationSchema = z.object({
  companyName: nameField,
  contactName: nameField,
  contactTitle: z.string().trim().max(100).optional().default(""),
  email: emailField,
  phone: phoneField,
  privacyConsent: z.literal(true),
  wantsIntroMeeting: z.boolean(),
  turnstileToken: z.string().min(1),
});

const bookedSlotsSchema = z.object({
  fromDate: dateField,
  toDate: dateField,
});

const coffeeChatBookingSchema = z.object({
  slotDate: dateField,
  slotTime: z
    .string()
    .refine((v) => (COFFEE_CHAT_SLOT_TIMES as readonly string[]).includes(v), "유효하지 않은 시간대입니다."),
  name: nameField,
  email: emailField,
  phone: phoneField,
  companyName: nameField,
  hiringConcern: z.string().trim().max(2000).optional().default(""),
  privacyConsent: z.literal(true),
  turnstileToken: z.string().min(1),
});

// ── 반환 타입 ─────────────────────────────────────────────────
export type BookedSlot = { slotDate: string; slotTime: string };

export type ServiceApplication = {
  id: string;
  companyName: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  wantsIntroMeeting: boolean;
  createdAt: string;
};

export type CoffeeChatBooking = {
  id: string;
  slotDate: string;
  slotTime: string;
  slotLabel: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  hiringConcern: string;
  createdAt: string;
};

export type AdminInquiries = {
  applications: ServiceApplication[];
  bookings: CoffeeChatBooking[];
};

type ServiceApplicationRow = Database["public"]["Tables"]["service_applications"]["Row"];
type CoffeeChatBookingRow = Database["public"]["Tables"]["coffee_chat_bookings"]["Row"];

function mapServiceApplication(row: ServiceApplicationRow): ServiceApplication {
  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactTitle: row.contact_title ?? "",
    email: row.email,
    phone: row.phone,
    wantsIntroMeeting: row.wants_intro_meeting,
    createdAt: formatDateTime(row.created_at),
  };
}

function mapCoffeeChatBooking(row: CoffeeChatBookingRow): CoffeeChatBooking {
  return {
    id: row.id,
    slotDate: row.slot_date,
    slotTime: row.slot_time,
    slotLabel: buildSlotLabel(row.slot_date, row.slot_time),
    name: row.name,
    email: row.email,
    phone: row.phone,
    companyName: row.company_name,
    hiringConcern: row.hiring_concern ?? "",
    createdAt: formatDateTime(row.created_at),
  };
}

// ── 서버 함수 ─────────────────────────────────────────────────

// 공개 엔드포인트: 인증 게이트 없이 zod 검증만이 유일한 방어선 (의도된 예외).
export const submitServiceApplication = createServerFn({ method: "POST" })
  .inputValidator(serviceApplicationSchema)
  .handler(async ({ data }) => {
    await verifyTurnstile(data.turnstileToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const title = data.contactTitle.trim();
    const { error } = await supabaseAdmin.from("service_applications").insert({
      company_name: data.companyName,
      contact_name: data.contactName,
      contact_title: title ? title : null,
      email: data.email,
      phone: data.phone,
      privacy_consent: data.privacyConsent,
      wants_intro_meeting: data.wantsIntroMeeting,
    });
    if (error) {
      console.error("Failed to insert service application:", error);
      throw new Error("신청 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    return { ok: true as const };
  });

// 공개 엔드포인트: 예약된 슬롯의 날짜/시간만 반환 (예약자 개인정보 절대 미노출).
export const getCoffeeChatBookedSlots = createServerFn({ method: "GET" })
  .inputValidator(bookedSlotsSchema)
  .handler(async ({ data }): Promise<BookedSlot[]> => {
    if (data.toDate < data.fromDate) {
      throw new Error("조회 범위가 올바르지 않습니다.");
    }
    if (data.toDate > addDaysIso(data.fromDate, 90)) {
      throw new Error("조회 범위가 너무 넓습니다.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("coffee_chat_bookings")
      .select("slot_date, slot_time")
      .gte("slot_date", data.fromDate)
      .lte("slot_date", data.toDate);
    if (error) {
      console.error("Failed to load booked coffee chat slots:", error);
      throw new Error("예약 현황을 불러오지 못했습니다.");
    }
    return (rows ?? []).map((r) => ({ slotDate: r.slot_date, slotTime: r.slot_time }));
  });

// 공개 엔드포인트: 클라이언트 비활성화를 믿지 않고 서버에서 날짜 규칙 재검증.
export const submitCoffeeChatBooking = createServerFn({ method: "POST" })
  .inputValidator(coffeeChatBookingSchema)
  .handler(async ({ data }) => {
    const todayIso = getKstTodayIso();
    if (data.slotDate <= todayIso) {
      throw new Error("당일 이후 날짜만 예약할 수 있습니다.");
    }
    const weekday = isoWeekday(data.slotDate);
    if (weekday === 0 || weekday === 6) {
      throw new Error("평일만 예약할 수 있습니다.");
    }
    if (data.slotDate > addDaysIso(todayIso, COFFEE_CHAT_MAX_AHEAD_DAYS)) {
      throw new Error("예약 가능 기간을 벗어났습니다.");
    }

    await verifyTurnstile(data.turnstileToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const concern = data.hiringConcern.trim();
    const { error } = await supabaseAdmin.from("coffee_chat_bookings").insert({
      slot_date: data.slotDate,
      slot_time: data.slotTime,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company_name: data.companyName,
      hiring_concern: concern ? concern : null,
      privacy_consent: data.privacyConsent,
    });
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new Error("방금 다른 분이 예약한 시간입니다. 다른 시간을 선택해주세요.");
      }
      console.error("Failed to insert coffee chat booking:", error);
      throw new Error("예약에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    return { ok: true as const };
  });

// 관리자 전용: 두 신청 목록 일괄 조회.
export const getAdminInquiries = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminInquiries> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [appsRes, bookingsRes] = await Promise.all([
      supabaseAdmin
        .from("service_applications")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("coffee_chat_bookings")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (appsRes.error) {
      console.error("Failed to load service applications:", appsRes.error);
      throw new Error("가입 신청 목록을 불러오지 못했습니다.");
    }
    if (bookingsRes.error) {
      console.error("Failed to load coffee chat bookings:", bookingsRes.error);
      throw new Error("커피챗 예약 목록을 불러오지 못했습니다.");
    }
    return {
      applications: (appsRes.data ?? []).map(mapServiceApplication),
      bookings: (bookingsRes.data ?? []).map(mapCoffeeChatBooking),
    };
  },
);
