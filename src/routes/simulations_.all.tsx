import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LayoutGrid, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardSkeleton,
  SimCard,
  fetchAll,
  type Simulation,
} from "./simulations";

export const Route = createFileRoute("/simulations_/all")({
  head: () => ({ meta: [{ title: "전체 직무 — Beginner" }] }),
  component: AllSimulationsPage,
});

function AllSimulationsPage() {
  const [sims, setSims] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setSims(await fetchAll());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* 뒤로 */}
      <Link
        to="/simulations"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" />
        추천으로 돌아가기
      </Link>

      {/* 헤더 */}
      <div className="mb-2 mt-4 flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-zinc-500" />
        <span className="text-sm font-medium text-zinc-500">전체 직무</span>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">
        모든 직무 시뮬레이션 둘러보기
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        관심 직무·기업과 상관없이 현재 열려있는 모든 시뮬레이션을 볼 수 있어요.
      </p>

      {/* 에러 */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 카드 목록 */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : sims.length > 0 ? (
          sims.map((sim) => <SimCard key={sim.id} sim={sim} />)
        ) : (
          <div className="col-span-full flex flex-col items-center py-20 text-center">
            <Sparkles className="h-10 w-10 text-zinc-300" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-700">
              아직 준비된 시뮬레이션이 없어요
            </h3>
            <p className="mt-2 max-w-xs text-sm text-zinc-400">
              곧 기업 시뮬레이션이 추가될 예정이에요. 조금만 기다려 주세요!
            </p>
            <Link to="/simulations" className="mt-6">
              <Button className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-700">
                추천 보러 가기
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
