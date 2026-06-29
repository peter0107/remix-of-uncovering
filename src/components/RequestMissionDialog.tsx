import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName?: string;
};

export function RequestMissionDialog({ open, onOpenChange, categoryName }: Props) {
  const [jobName, setJobName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const posthog = usePostHog();

  const trimmed = jobName.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 80;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/mission-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobName: trimmed,
          categoryName: categoryName ?? "",
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "전송에 실패했습니다.");
      }
      posthog.capture("mission_requested", {
        job_name: trimmed,
        category_name: categoryName ?? "",
      });
      toast.success("요청이 전달되었습니다. 빠르게 검토할게요!");
      setJobName("");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "전송에 실패했습니다.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-[360px] gap-3 p-5 sm:max-w-[440px] sm:gap-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">직무 체험 요청하기</DialogTitle>
          <DialogDescription>
            체험해보고 싶은 직무를 알려주세요. 운영팀이 검토 후 시뮬레이션 제작을 검토합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {categoryName && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              선택한 카테고리 ·{" "}
              <span className="font-semibold text-foreground/80">{categoryName}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="req-job">희망 직무명</Label>
            <Input
              id="req-job"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="예: 브랜드 마케터, 데이터 분석가"
              maxLength={80}
              autoFocus
              disabled={submitting}
            />
            <p className="text-right text-[11px] text-muted-foreground">{trimmed.length}/80</p>
          </div>

          <Button
            type="submit"
            disabled={!valid || submitting}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 요청 전송 중...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> 요청 보내기
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
