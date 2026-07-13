import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleCheck, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Calendar } from "@/components/ui/calendar";
import { TurnstileWidget, type TurnstileHandle } from "@/components/turnstile-widget";
import {
  COFFEE_CHAT_MAX_AHEAD_DAYS,
  COFFEE_CHAT_SLOT_TIMES,
  getCoffeeChatBookedSlots,
  submitCoffeeChatBooking,
} from "@/lib/inquiries.functions";

export const Route = createFileRoute("/biz_/coffee-chat")({
  head: () => ({
    meta: [
      { title: "Beginner - 커피챗 신청" },
      {
        name: "description",
        content: "30분 구글미트로 진행되는 커피챗을 신청하세요.",
      },
    ],
  }),
  component: BizCoffeeChat,
});

const inputClass =
  "mt-2 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900";
const labelClass = "block text-xs font-medium text-neutral-700";
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// ── KST 달력 유틸 (서버 함수와 동일 규칙) ──────────────────────
function kstTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 캘린더의 로컬 Date → 'YYYY-MM-DD'. 로컬 파츠 사용(브라우저 KST라 KST 달력 날짜와 일치).
function dateToLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateLabel(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function BizCoffeeChat() {
  const { minIso, maxIso } = useMemo(() => {
    const today = kstTodayIso();
    return { minIso: addDaysIso(today, 1), maxIso: addDaysIso(today, COFFEE_CHAT_MAX_AHEAD_DAYS) };
  }, []);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSet, setBookedSet] = useState<Set<string>>(new Set());
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hiringConcern, setHiringConcern] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneLabel, setDoneLabel] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    setSlotsError(false);
    try {
      const rows = await getCoffeeChatBookedSlots({
        data: { fromDate: minIso, toDate: maxIso },
      });
      setBookedSet(new Set(rows.map((r) => `${r.slotDate}|${r.slotTime}`)));
    } catch {
      setSlotsError(true);
    } finally {
      setSlotsLoading(false);
    }
  }, [minIso, maxIso]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setError("날짜와 시간을 선택해주세요.");
      return;
    }
    const tName = name.trim();
    const tEmail = email.trim();
    const tPhone = phone.trim();
    const tCompany = companyName.trim();
    if (!tName || !tEmail || !tPhone || !tCompany) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }
    if (!EMAIL_RE.test(tEmail)) {
      setError("이메일 형식을 확인해주세요.");
      return;
    }
    if (!privacyConsent) {
      setError("개인정보 수집·이용 동의가 필요합니다.");
      return;
    }
    if (!turnstileToken) {
      setError("보안 확인을 완료해주세요.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await submitCoffeeChatBooking({
        data: {
          slotDate: selectedDate,
          slotTime: selectedTime,
          name: tName,
          email: tEmail,
          phone: tPhone,
          companyName: tCompany,
          hiringConcern: hiringConcern.trim(),
          privacyConsent: true,
          turnstileToken,
        },
      });
      setDoneLabel(`${dateLabel(selectedDate)} ${selectedTime}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "예약에 실패했습니다.";
      toast.error(msg);
      turnstileRef.current?.reset();
      setTurnstileToken("");
      if (msg.includes("예약한 시간")) {
        setSelectedTime("");
        void loadSlots();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="flex h-14 items-center border-b border-neutral-200 px-6">
        <Link to="/biz" className="text-sm font-semibold tracking-tight">
          Beginner
        </Link>
        <span className="ml-1 text-xs font-light text-neutral-500">biz</span>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-10">
        {doneLabel ? (
          <div className="w-full max-w-sm py-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-900 text-white">
              <CircleCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-xl font-semibold tracking-tight">커피챗이 신청됐습니다</h1>
            <p className="mt-2 text-sm text-neutral-500">{doneLabel} · 30분 구글미트</p>
            <p className="mt-4 text-sm text-neutral-500">
              확정된 구글미트 링크는 입력하신 이메일로 담당자가 보내드립니다.
            </p>
            <Link
              to="/biz"
              className="mt-8 inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
            >
              코드 입력으로 돌아가기
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight">커피챗 신청</h1>
            <p className="mt-2 text-sm text-neutral-500">
              30분 구글미트로 Beginner 기업 서비스에 대해 편하게 이야기 나눠요.
              <br />
              원하는 시간을 선택하고 예약 정보를 남겨주세요.
            </p>

            <form onSubmit={onSubmit} className="mt-8 grid gap-10 lg:grid-cols-2">
              {/* 좌: 날짜 + 슬롯 선택 */}
              <div>
                <p className={labelClass}>날짜 선택 *</p>
                <div className="mt-2 w-fit rounded-md border border-neutral-200">
                  <Calendar
                    mode="single"
                    selected={selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined}
                    onSelect={(date) => {
                      setSelectedDate(date ? dateToLocalIso(date) : "");
                      setSelectedTime("");
                    }}
                    disabled={(date) => {
                      const iso = dateToLocalIso(date);
                      if (iso < minIso || iso > maxIso) return true;
                      const wd = date.getDay();
                      return wd === 0 || wd === 6;
                    }}
                    startMonth={new Date(`${minIso}T00:00:00`)}
                    endMonth={new Date(`${maxIso}T00:00:00`)}
                  />
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>시간 선택 *</p>
                    {slotsError && (
                      <button
                        type="button"
                        onClick={loadSlots}
                        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900"
                      >
                        <RefreshCw className="h-3 w-3" />
                        다시 시도
                      </button>
                    )}
                  </div>

                  {!selectedDate ? (
                    <p className="mt-3 text-sm text-neutral-400">날짜를 먼저 선택해주세요.</p>
                  ) : slotsLoading ? (
                    <p className="mt-3 text-sm text-neutral-400">예약 현황을 불러오는 중입니다...</p>
                  ) : slotsError ? (
                    <p className="mt-3 text-sm text-red-600">
                      예약 현황을 불러오지 못했습니다. 다시 시도해주세요.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {COFFEE_CHAT_SLOT_TIMES.map((t) => {
                        const booked = bookedSet.has(`${selectedDate}|${t}`);
                        const selected = selectedTime === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={booked}
                            onClick={() => setSelectedTime(t)}
                            className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                              booked
                                ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 line-through"
                                : selected
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-300 text-neutral-700 hover:border-neutral-900"
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 우: 예약 정보 */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className={labelClass}>
                    이름 *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 홍길동"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>
                    이메일 *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="예: contact@company.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>
                    전화번호 *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="companyName" className={labelClass}>
                    기업명 *
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="예: 비기너 주식회사"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="hiringConcern" className={labelClass}>
                    채용 고민
                  </label>
                  <textarea
                    id="hiringConcern"
                    value={hiringConcern}
                    onChange={(e) => setHiringConcern(e.target.value)}
                    placeholder="현재 채용에서 겪는 고민을 자유롭게 남겨주세요."
                    rows={4}
                    className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900"
                  />
                </div>

                <label className="flex items-start gap-2.5 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900"
                  />
                  <span>
                    개인정보 수집·이용에 동의합니다. <span className="text-neutral-400">(필수)</span>
                  </span>
                </label>

                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => setTurnstileToken("")}
                />

                {error && <p className="text-xs text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 w-full rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "예약 중..." : "예약하기"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
