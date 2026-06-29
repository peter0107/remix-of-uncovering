import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Upload, FileCheck2, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { COMPETENCY_GROUPS, getCompetencyName } from "@/data/competencies";
import { EXPERIENCE_OPTIONS } from "@/lib/missions";
import { submitExpertMission } from "@/lib/missions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";
export const Route = createFileRoute("/submit-mission")({
  head: () => ({
    meta: [
      { title: "현직자 시뮬레이션 제안 — beginner" },
      { name: "description", content: "현직자가 직접 만든 직무 시뮬레이션을 제안하세요." },
    ],
  }),
  component: SubmitMissionPage,
});

const COMPANY_SIZES = ["대기업", "중견기업", "중소기업", "스타트업"] as const;
const INDUSTRIES = [
  "IT·정보통신",
  "금융·은행",
  "판매·유통",
  "제조·생산",
  "서비스",
  "미디어·광고",
  "의료·제약",
] as const;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const schema = z.object({
  authorName: z.string().trim().min(1, "이름/닉네임을 입력해주세요").max(50),
  authorRole: z.string().trim().min(1, "현재 직무를 입력해주세요").max(80),
  companyName: z.string().trim().min(1, "회사명을 입력해주세요").max(100),
  yearsExperience: z
    .number()
    .int()
    .refine((n) => [1, 3, 6, 10].includes(n), { message: "연차를 선택해주세요" }),
  companySize: z.enum(COMPANY_SIZES, { errorMap: () => ({ message: "기업 규모를 선택해주세요" }) }),
  industry: z.enum(INDUSTRIES, { errorMap: () => ({ message: "산업군을 선택해주세요" }) }),

  frequentTasks: z.string().trim().min(30, "30자 이상 구체적으로 작성해주세요").max(2000),
  situation: z.string().trim().min(1, "실제 상황/배경을 입력해주세요").max(2000),
  dataPoints: z.string().trim().min(1, "주로 보는 데이터나 지표를 입력해주세요").max(2000),
  competencies: z.array(z.string()).length(6, "필요 역량은 정확히 6개를 선택해주세요"),
});

function SubmitMissionPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const posthog = usePostHog();

  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [yearsExperience, setYearsExperience] = useState<string>("");
  const [companySize, setCompanySize] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");

  const [frequentTasks, setFrequentTasks] = useState("");
  const [situation, setSituation] = useState("");
  const [dataPointsText, setDataPointsText] = useState("");
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-primary">로그인이 필요해요</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            현직자 시뮬레이션 제안은 로그인 후 이용할 수 있습니다.
          </p>
          <Link to="/login" search={{ redirect: "/submit-mission" }}>
            <Button className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90">
              로그인하러 가기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-primary">제출 완료!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            관리자 검토 후 공개됩니다. 검토 결과는 별도로 안내드릴게요.
          </p>
          <Link to="/">
            <Button variant="outline" className="mt-6">
              홈으로
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  function toggleCompetency(id: string) {
    setCompetencies((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 6) {
        toast.error("최대 6개까지 선택할 수 있어요.");
        return prev;
      }
      return [...prev, id];
    });
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("파일 크기는 10MB 이하여야 합니다.");
      e.target.value = "";
      return;
    }
    setVerificationFile(file);
  }

  async function uploadVerification(): Promise<string | null> {
    if (!verificationFile || !user) return null;
    const ext = verificationFile.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("expert-verification")
      .upload(path, verificationFile, { upsert: false });
    if (error) throw new Error(`인증 파일 업로드 실패: ${error.message}`);
    return path;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      authorName,
      authorRole,
      companyName,
      yearsExperience: Number(yearsExperience),
      companySize,
      industry,
      frequentTasks,
      situation,
      dataPoints: dataPointsText,
      competencies,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!verificationFile) {
      toast.error("현직자 인증 파일을 첨부해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const verificationPath = await uploadVerification();
      await submitExpertMission({
        job_slug: "",
        title: parsed.data.frequentTasks.slice(0, 60),
        description: parsed.data.frequentTasks.slice(0, 200),
        situation: parsed.data.situation,
        data_points: [parsed.data.dataPoints],
        author_name: parsed.data.authorName,
        author_role: parsed.data.authorRole,
        years_experience: parsed.data.yearsExperience,
        industry_categories: [parsed.data.industry],
        frequent_tasks: parsed.data.frequentTasks,
        submitted_competencies: parsed.data.competencies,
        company_size: parsed.data.companySize,
        company_name: parsed.data.companyName,
        industry: parsed.data.industry,
        verification_file_url: verificationPath,
      });
      posthog.capture("expert_mission_submitted", {
        author_role: parsed.data.authorRole,
        industry: parsed.data.industry,
        company_size: parsed.data.companySize,
        years_experience: parsed.data.yearsExperience,
      });
      setSubmitted(true);
    } catch (err) {
      posthog.captureException(err);
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">현직자 시뮬레이션 제안</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          여러분이 보내주신 내용을 바탕으로 시뮬레이션 제작을 검토합니다. 제출한 내용은 내부 검토 후
          공개됩니다.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="p-6 space-y-5">
          <h2 className="text-base font-bold text-primary">현직자 정보</h2>

          <div className="grid gap-2">
            <Label>
              성함 <span className="text-destructive">*</span>
            </Label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="김OO"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>
                현재 직무 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="프로덕트 디자이너"
              />
            </div>
            <div className="grid gap-2">
              <Label>
                회사명 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="예: 토스"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              경력 연차 <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => {
                const active = Number(yearsExperience) === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setYearsExperience(String(opt.value))}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-background text-foreground/70 hover:border-brand/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              기업 규모 <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_SIZES.map((size) => {
                const active = companySize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setCompanySize(size)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-background text-foreground/70 hover:border-brand/40"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              산업군 <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((name) => {
                const active = industry === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIndustry(name)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-background text-foreground/70 hover:border-brand/40"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              현직자 인증 파일 <span className="text-destructive">*</span>{" "}
              <span className="text-xs text-muted-foreground">(10MB 이하)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              재직증명서, 사원증, 명함 등 현직자임을 확인할 수 있는 파일을 첨부해주세요.
            </p>
            {verificationFile ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <FileCheck2 className="h-4 w-4 text-brand" />
                  <span className="truncate">{verificationFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(verificationFile.size / 1024).toFixed(0)} KB)
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setVerificationFile(null)}
                  className="h-7 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground">
                <Upload className="h-4 w-4" />
                <span>파일 선택 (PDF, JPG, PNG 등)</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                  onChange={onPickFile}
                />
              </label>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h2 className="text-base font-bold text-primary">시뮬레이션 정보</h2>

          <div className="grid gap-2">
            <Label>
              1. 반복하거나 자주 하는 업무 소개 <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">구체적일수록 좋아요. (30자 이상)</p>
            <Textarea
              rows={5}
              value={frequentTasks}
              onChange={(e) => setFrequentTasks(e.target.value)}
              placeholder="예: 매주 월요일 핵심 지표를 보고 이탈 구간을 분석한 후, 디자인팀과 개선 안건을 정렬하는 회의를 진행합니다."
            />
            <div className="text-right text-xs text-muted-foreground">
              {frequentTasks.length} / 2000
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              2. 실제 상황/배경 <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              업무 시 실제로 마주칠 만한 상황을 자유롭게 적어주세요.
            </p>
            <Textarea
              rows={4}
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="예: 신규 기능 출시 후 첫 주, 사용자 가입은 늘었지만 결제 전환은 떨어진 상황..."
            />
          </div>

          <div className="grid gap-2">
            <Label>
              3. 주로 보는 데이터나 지표 <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">자유롭게 적어주세요.</p>
            <Textarea
              rows={4}
              value={dataPointsText}
              onChange={(e) => setDataPointsText(e.target.value)}
              placeholder={
                "예시:\n주간 가입자 수 +30%, 결제 전환율 4.2% → 2.8%\n이탈 1순위 화면: 주문 확인\n추가로 참고하는 데이터도 함께 적어주세요."
              }
            />
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-primary">필요 역량 (6개 선택)</h2>
            <Badge variant={competencies.length === 6 ? "default" : "secondary"}>
              {competencies.length} / 6
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            이 업무를 잘 수행하기 위해 가장 중요한 역량 6개를 선택해주세요.
          </p>

          {competencies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-md bg-muted/50 p-3">
              {competencies.map((id) => (
                <Badge key={id} variant="outline" className="bg-background">
                  {getCompetencyName(id)}
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-5">
            {COMPETENCY_GROUPS.map((g) => (
              <div key={g.id}>
                <div className="mb-2 text-xs font-bold text-foreground/70">
                  {g.id}. {g.name}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {g.competencies.map((c) => {
                    const checked = competencies.includes(c.id);
                    const disabled = !checked && competencies.length >= 6;
                    return (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                          checked
                            ? "border-brand bg-brand-soft/40"
                            : disabled
                              ? "border-border bg-muted/30 opacity-50"
                              : "border-border bg-background hover:border-brand/40"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={() => toggleCompetency(c.id)}
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link to="/">
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: "#008f8f" }}
            className="text-white hover:opacity-90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                제출 중...
              </>
            ) : (
              "제출"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
