import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { TurnstileWidget, type TurnstileHandle } from "@/components/turnstile-widget";
import { submitServiceApplication } from "@/lib/inquiries.functions";

export const Route = createFileRoute("/biz_/apply")({
  head: () => ({
    meta: [
      { title: "Beginner - 기업 서비스 가입 신청" },
      {
        name: "description",
        content: "Beginner 기업 서비스 가입을 신청하세요.",
      },
    ],
  }),
  component: BizApply,
});

const inputClass =
  "mt-2 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900";
const labelClass = "block text-xs font-medium text-neutral-700";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function BizApply() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [wantsIntroMeeting, setWantsIntroMeeting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedCompany = companyName.trim();
    const trimmedContact = contactName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedCompany || !trimmedContact || !trimmedEmail || !trimmedPhone) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
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
      await submitServiceApplication({
        data: {
          companyName: trimmedCompany,
          contactName: trimmedContact,
          contactTitle: contactTitle.trim(),
          email: trimmedEmail,
          phone: trimmedPhone,
          privacyConsent: true,
          wantsIntroMeeting,
          turnstileToken,
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "신청 접수에 실패했습니다.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
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

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {done ? (
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-900 text-white">
                <CircleCheck className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-xl font-semibold tracking-tight">신청이 접수됐습니다</h1>
              <p className="mt-2 text-sm text-neutral-500">
                담당자가 확인한 뒤 입력하신 이메일로 연락드립니다.
              </p>
              <Link
                to="/biz"
                className="mt-8 inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
              >
                코드 입력으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Beginner 기업 서비스 가입 신청</h1>
              <p className="mt-2 text-sm text-neutral-500">
                신청 내용을 확인한 뒤 담당자가 연락드립니다.
              </p>

              <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
                  <label htmlFor="contactName" className={labelClass}>
                    담당자명 *
                  </label>
                  <input
                    id="contactName"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="예: 홍길동"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="contactTitle" className={labelClass}>
                    직함
                  </label>
                  <input
                    id="contactTitle"
                    type="text"
                    value={contactTitle}
                    onChange={(e) => setContactTitle(e.target.value)}
                    placeholder="예: 인사팀 매니저"
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

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-2.5 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900"
                    />
                    <span>
                      개인정보 수집·이용에 동의합니다.{" "}
                      <span className="text-neutral-400">(필수)</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={wantsIntroMeeting}
                      onChange={(e) => setWantsIntroMeeting(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900"
                    />
                    <span>15분 온라인 미팅으로 Beginner 기업서비스에 대해 완벽히 이해하고 싶어요.</span>
                  </label>
                </div>

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
                  {isSubmitting ? "제출 중..." : "신청하기"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
