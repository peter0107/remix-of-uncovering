import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Check, Loader2, Lock, X, FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PRODUCTS, getProduct, formatKRW } from "@/data/products";
import { createOrder, upgradeOrderToCompare, upgradeOrderToFeedback } from "@/lib/orders";
import {
  PAYMENT_MODE,
  isMockPayment,
  confirmPaymentClient,
  createPayappCheckoutFn,
} from "@/lib/payments";
import { resolveJobName } from "@/lib/jobLookup";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";

const search = z.object({
  job: z.string().optional(),
  product: z
    .enum(["single", "compare", "feedback", "summary", "upgrade", "upgrade_feedback"])
    .optional(),
  mission: z.string().optional(),
  order: z.string().optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (s) => search.parse(s),
  head: () => ({ meta: [{ title: "결제하기 — beginner" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const sp = Route.useSearch();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const product = getProduct(sp.product ?? "single") ?? PRODUCTS[0];
  const jobSlug = sp.job ?? "";
  const missionId = sp.mission ?? null;
  const orderIdToUpgrade = sp.order ?? null;
  const [jobName, setJobName] = useState<string>(jobSlug);

  useEffect(() => {
    if (!jobSlug) return;
    resolveJobName(jobSlug).then(setJobName);
  }, [jobSlug]);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [paying, setPaying] = useState(false);

  const valid = agreeTerms && agreePrivacy;

  const isSummary = product.id === "summary";
  const isUpgrade = product.id === "upgrade";
  const isUpgradeFeedback = product.id === "upgrade_feedback";
  const anyUpgrade = isUpgrade || isUpgradeFeedback;

  const createPayappCheckout = useServerFn(createPayappCheckoutFn);

  /**
   * 결제 완료 후 권한 부여 로직.
   * mock / payapp 모두 동일하게 호출됩니다.
   */
  const grantAccessAfterPayment = async (orderId: string | null) => {
    if (isUpgrade && orderIdToUpgrade) {
      await upgradeOrderToCompare(orderIdToUpgrade);
      posthog.capture("payment_completed", {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        order_id: orderIdToUpgrade,
        payment_mode: PAYMENT_MODE,
      });
      toast.success("업그레이드 완료! 리포트 전체를 확인할 수 있어요.");
      navigate({ to: "/report/$orderId", params: { orderId: orderIdToUpgrade } });
      return;
    }
    if (isUpgradeFeedback && orderIdToUpgrade) {
      await upgradeOrderToFeedback(orderIdToUpgrade);
      posthog.capture("payment_completed", {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        order_id: orderIdToUpgrade,
        payment_mode: PAYMENT_MODE,
      });
      toast.success("업그레이드 완료! 상세 피드백을 확인할 수 있어요.");
      navigate({ to: "/report/$orderId", params: { orderId: orderIdToUpgrade } });
      return;
    }
    if (orderId) {
      await confirmPaymentClient(orderId);
    }
    posthog.capture("payment_completed", {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      job_slug: jobSlug,
      job_name: jobName,
      order_id: orderId,
      payment_mode: PAYMENT_MODE,
    });
    toast.success(
      isSummary
        ? "결제가 완료되었습니다. 진로 탐색 요약이 열렸어요."
        : "결제가 완료되었습니다. 시뮬레이션을 시작해주세요.",
    );
    if (isSummary || !orderId) {
      navigate({ to: "/my" });
    } else {
      navigate({ to: "/mission/$orderId", params: { orderId } });
    }
  };

  const handlePay = async () => {
    if (paying) return;
    if (anyUpgrade && !orderIdToUpgrade) {
      toast.error("업그레이드할 주문 정보가 없습니다");
      return;
    }
    if (!isSummary && !anyUpgrade && !jobSlug) {
      toast.error("직무 정보가 없습니다");
      return;
    }
    posthog.capture("checkout_started", {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      job_slug: jobSlug,
      payment_mode: PAYMENT_MODE,
    });
    setPaying(true);
    try {
      // 업그레이드는 즉시 처리 (별도 결제 게이트웨이 없음)
      if (anyUpgrade) {
        await grantAccessAfterPayment(null);
        return;
      }

      // 신규 주문: 우선 payment_pending 으로 생성
      const order = await createOrder({
        email: "",
        jobSlug: isSummary ? "__summary__" : jobSlug,
        productId: product.id as "single" | "compare" | "feedback" | "summary",
        missionId: isSummary ? null : missionId,
        status: "payment_pending",
      });

      if (isMockPayment()) {
        // 테스트 결제: 실제 결제 없이 즉시 권한 부여
        await grantAccessAfterPayment(order.id);
        return;
      }

      // 운영 결제: PayApp 결제창으로 리다이렉트.
      // 완료 후 콜백(/api/public/payapp-callback) 에서 상태 전환.
      const { payUrl } = await createPayappCheckout({
        data: {
          orderId: order.id,
          productName: isSummary ? product.name : `${jobName} 체험`,
          price: product.price,
        },
      });
      window.location.href = payUrl;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("로그인")) {
        toast.error("로그인이 필요합니다");
        navigate({ to: "/login", search: { redirect: "/checkout" } });
      } else {
        toast.error(msg || "결제 처리에 실패했습니다");
      }
      setPaying(false);
    }
  };

  const payButtonLabel = paying
    ? "결제 처리 중..."
    : isMockPayment()
      ? `[테스트] ${formatKRW(product.price)} 결제 성공 처리`
      : `${formatKRW(product.price)} 결제하기`;

  return (
    <div className="min-h-screen bg-muted/30">
      {paying && (
        <LoadingOverlay
          message={isMockPayment() ? "테스트 결제 처리 중..." : "결제창으로 이동 중..."}
        />
      )}
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary md:text-4xl">결제하기</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              선택하신 상품을 확인하고 결제를 진행해주세요.
            </p>
          </div>
          <Link
            to="/experiences"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            나가기
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Order summary */}
          <Card className="flex flex-col p-6">
            <h2 className="text-lg font-semibold text-primary">주문 상품</h2>

            <div className="mt-5 rounded-lg border border-border bg-muted/30 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold text-foreground">
                  {isSummary || anyUpgrade ? product.name : `${jobName} 체험`}
                </div>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {isSummary ? "요약 해제" : anyUpgrade ? "리포트 업그레이드" : "1개 직무"}
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold text-primary">{formatKRW(product.price)}</div>
              <ul className="mt-5 space-y-2 text-sm">
                {product.includes.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto flex items-end justify-between border-t border-border pt-6">
              <span className="text-sm text-muted-foreground">총 결제 금액</span>
              <span className="text-3xl font-bold text-primary">{formatKRW(product.price)}</span>
            </div>
          </Card>

          {/* Payment info */}
          <Card className="flex flex-col p-6">
            <h2 className="text-lg font-semibold text-primary">결제 정보</h2>

            <div className="mt-5">
              <div className="text-sm font-medium text-foreground">결제 수단</div>
              <div className="mt-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
                {isMockPayment() ? (
                  <div className="flex items-start gap-2">
                    <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <div className="font-semibold text-foreground">테스트 결제 모드</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        실제 결제 없이 결제 성공 상태로 처리됩니다. 실서비스 전환 시{" "}
                        <code className="rounded bg-background px-1">VITE_PAYMENT_MODE=payapp</code>{" "}
                        로 변경하세요.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-foreground">PayApp 간편결제</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      결제 버튼을 누르면 PayApp 결제창으로 이동합니다. 결제 완료 후 자동으로
                      처리됩니다.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">이용 동의</div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={agreeTerms && agreePrivacy && agreeMarketing}
                    onCheckedChange={(v) => {
                      const next = !!v;
                      setAgreeTerms(next);
                      setAgreePrivacy(next);
                      setAgreeMarketing(next);
                    }}
                  />
                  <span>전체 동의</span>
                </label>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <AgreeRow
                  checked={agreeTerms}
                  onChange={setAgreeTerms}
                  label="서비스 이용 약관에 동의합니다."
                  required
                />
                <AgreeRow
                  checked={agreePrivacy}
                  onChange={setAgreePrivacy}
                  label="개인정보 처리방침에 동의합니다."
                  required
                />
                <AgreeRow
                  checked={agreeMarketing}
                  onChange={setAgreeMarketing}
                  label="마케팅 정보 수신에 동의합니다."
                />
              </div>
            </div>

            <Button
              disabled={!valid || paying}
              onClick={handlePay}
              size="lg"
              className="mt-6 w-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payButtonLabel}
            </Button>

            <div className="mt-3 text-center text-xs text-muted-foreground">
              현재 결제 모드: <span className="font-mono">{PAYMENT_MODE}</span>
            </div>
          </Card>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          안전한 결제를 위해 SSL 암호화를 적용했습니다.
        </div>
      </div>
    </div>
  );
}

function AgreeRow({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span>
        {label}{" "}
        <span className={required ? "text-brand" : "text-muted-foreground"}>
          ({required ? "필수" : "선택"})
        </span>
      </span>
    </label>
  );
}
