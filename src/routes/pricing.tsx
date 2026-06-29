import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRODUCTS, formatKRW } from "@/data/products";
import { usePostHog } from "@posthog/react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "가격 — beginner" },
      { name: "description", content: "직무 체험 상품 가격을 확인하세요." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const posthog = usePostHog();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-primary md:text-4xl">가격</h1>
        <p className="mt-2 text-muted-foreground">
          1개 직무부터 비교 체험, 현직자 피드백까지 선택할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {PRODUCTS.filter((p) => p.id !== "upgrade").map((p) => (
          <Card
            key={p.id}
            id={p.id}
            className={`flex flex-col p-6 ${
              p.recommended ? "border-brand ring-2 ring-brand/20" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-primary">{p.name}</div>
              {p.recommended && (
                <Badge className="bg-brand text-brand-foreground hover:bg-brand">추천</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
            <div className="mt-5 text-3xl font-bold text-primary">{formatKRW(p.price)}</div>
            <ul className="mt-5 space-y-2 text-sm">
              {p.includes.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-brand" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Link
                to="/checkout"
                search={{ product: p.id }}
                onClick={() =>
                  posthog.capture("pricing_plan_clicked", {
                    product_id: p.id,
                    product_name: p.name,
                    price: p.price,
                    recommended: p.recommended ?? false,
                  })
                }
              >
                <Button
                  className={`w-full ${
                    p.recommended ? "bg-brand text-brand-foreground hover:bg-brand/90" : ""
                  }`}
                  variant={p.recommended ? "default" : "outline"}
                >
                  {p.cta}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
