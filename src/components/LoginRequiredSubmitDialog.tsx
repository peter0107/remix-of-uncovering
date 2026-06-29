import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo: string;
};

export function LoginRequiredSubmitDialog({ open, onOpenChange, redirectTo }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6">
        <DialogTitle className="sr-only">로그인 필요</DialogTitle>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-primary">
            모범답안 및 결과를 확인하려면 로그인이 필요합니다.
          </p>
          <Button
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/login", search: { redirect: redirectTo } });
            }}
          >
            로그인하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
