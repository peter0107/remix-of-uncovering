import { Loader2 } from "lucide-react";

export function LoadingOverlay({ message = "처리 중..." }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-lg bg-background px-8 py-6 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    </div>
  );
}

export function NavigationOverlay() {
  return <LoadingOverlay message="페이지 이동 중..." />;
}
