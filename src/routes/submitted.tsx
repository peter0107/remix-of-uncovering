import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/submitted")({
  validateSearch: (s) => z.object({ orderId: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "제출 완료 — beginner" }] }),
  component: SubmittedPage,
});

function SubmittedPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand" />
        <h1 className="mt-4 text-2xl font-bold text-primary">답변이 제출되었습니다.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          결과 리포트가 준비되면 이메일과 마이페이지에서 확인할 수 있습니다.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/my">
            <Button variant="outline">마이페이지로 이동</Button>
          </Link>
          <Link to="/experiences">
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
              다른 직무 체험하기
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
