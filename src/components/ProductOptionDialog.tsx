import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PRODUCTS,
  COMPARE_FEATURES,
  formatKRW,
  type Product,
} from "@/data/products";

const DIALOG_PRODUCTS = PRODUCTS.filter(
  (p) => p.id !== "summary" && p.id !== "upgrade" && p.id !== "upgrade_feedback"
);

export function ProductOptionDialog({
  open,
  onOpenChange,
  jobSlug,
  missionId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobSlug: string;
  missionId?: string | null;
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Product["id"]>("compare");
  const product = PRODUCTS.find((p) => p.id === selected)!;

  const handleContinue = () => {
    onOpenChange(false);
    navigate({
      to: "/checkout",
      search: {
        job: jobSlug,
        product: selected,
        ...(missionId ? { mission: missionId } : {}),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-xl p-4 sm:p-6">
        <DialogTitle className="text-lg font-bold text-primary sm:text-xl">
          옵션을 선택해주세요
        </DialogTitle>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          어느 깊이까지 분석을 받을지 선택할 수 있어요.
        </p>

        {/* 카드 3개 */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
          {DIALOG_PRODUCTS.map((p) => {
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`flex flex-col rounded-xl border p-3.5 text-left transition-all sm:p-4 ${
                  active
                    ? "border-brand bg-brand-soft/40 ring-2 ring-brand/30"
                    : "border-border bg-background hover:border-brand/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">
                    {p.name}
                  </span>
                  {p.recommended && (
                    <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                      추천
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 text-lg font-bold text-primary sm:mt-2 sm:text-xl">
                  {formatKRW(p.price)}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {p.tagline}
                </p>
              </button>
            );
          })}
        </div>

        {/* 비교표 */}
        <div className="mt-4 overflow-hidden rounded-lg border border-border sm:mt-5">
          <table className="w-full table-fixed text-[11px] sm:text-sm">
            <colgroup>
              <col className="w-[28%] sm:w-[25%]" />
              <col className="w-[24%] sm:w-[25%]" />
              <col className="w-[24%] sm:w-[25%]" />
              <col className="w-[24%] sm:w-[25%]" />
            </colgroup>
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-foreground sm:px-3">
                  구분
                </th>
                {DIALOG_PRODUCTS.map((p) => (
                  <th
                    key={p.id}
                    className={`px-1 py-2 text-center font-semibold sm:px-2 ${
                      selected === p.id ? "bg-brand-soft text-primary" : "text-foreground"
                    }`}
                  >
                    {formatKRW(p.price)}
                  </th>
                ))}
              </tr>
              <tr className="border-t border-border">
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-muted-foreground sm:px-3 sm:py-2 sm:text-[11px]">
                  상품명
                </th>
                {DIALOG_PRODUCTS.map((p) => (
                  <th
                    key={p.id}
                    className={`px-1 py-1.5 text-center text-[10px] font-medium leading-tight sm:px-2 sm:py-2 sm:text-[11px] ${
                      selected === p.id ? "bg-brand-soft text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_FEATURES.map((f) => (
                <tr key={f.key} className="border-t border-border">
                  <td className="whitespace-pre-line px-2 py-1.5 text-foreground leading-tight sm:px-3 sm:py-2">{f.label}</td>
                  {f.values.map((v, i) => {
                    const isSelectedCol = DIALOG_PRODUCTS[i].id === selected;
                    const isCheck = v === "O";
                    const isCross = v === "X";
                    const isCheckWithNote = v.startsWith("O ");
                    return (
                      <td
                        key={i}
                        className={`px-1 py-1.5 text-center sm:px-2 sm:py-2 ${
                          isSelectedCol ? "bg-brand-soft/40" : ""
                        }`}
                      >
                        {isCheck ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-brand sm:h-4 sm:w-4" />
                        ) : isCross ? (
                          <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/50 sm:h-4 sm:w-4" />
                        ) : isCheckWithNote ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Check className="h-3.5 w-3.5 text-brand sm:h-4 sm:w-4" />
                            <span className="text-[9px] font-medium leading-tight text-foreground sm:text-[10px]">
                              {v.slice(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-medium leading-tight text-foreground sm:text-[11px]">
                            {v}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 액션 */}
        <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">선택한 옵션</div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold text-primary">
                {product.name}
              </span>
              <span className="text-lg font-bold text-primary">
                {formatKRW(product.price)}
              </span>
            </div>
          </div>
          <Button
            size="lg"
            onClick={handleContinue}
            style={{ backgroundColor: "#008f8f" }}
            className="w-full px-6 text-white hover:opacity-90 sm:w-auto"
          >
            이 옵션으로 결제하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
