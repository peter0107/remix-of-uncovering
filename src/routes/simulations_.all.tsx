import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LayoutGrid, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardSkeleton, SimCard, fetchAll, type Simulation } from "./simulations";

export const Route = createFileRoute("/simulations_/all")({
  head: () => ({ meta: [{ title: "전체 직무 — Beginner" }] }),
  component: AllSimulationsPage,
});

function AllSimulationsPage() {
  const [sims, setSims] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState("all");
  const [query, setQuery] = useState("");

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

  const domainOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sims
            .map((simulation) => simulation.domain?.trim())
            .filter((domain): domain is string => Boolean(domain)),
        ),
      ).sort((a, b) => a.localeCompare(b, "ko")),
    [sims],
  );

  const filteredSims = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko");

    return sims.filter((simulation) => {
      const matchesDomain = domainFilter === "all" || simulation.domain === domainFilter;
      const jobName = simulation.role_label || simulation.title;
      const matchesQuery =
        !normalizedQuery ||
        `${jobName} ${simulation.title}`.toLocaleLowerCase("ko").includes(normalizedQuery);

      return matchesDomain && matchesQuery;
    });
  }, [domainFilter, query, sims]);

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

      {!loading && sims.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="simulation-domain-filter">
            직무군 필터
          </label>
          <select
            id="simulation-domain-filter"
            value={domainFilter}
            onChange={(event) => setDomainFilter(event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition-colors focus:border-zinc-500 sm:w-52"
          >
            <option value="all">전체 직무군</option>
            {domainOptions.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>

          <label className="relative block w-full sm:max-w-sm" htmlFor="simulation-job-search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="simulation-job-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="직무명 검색"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500"
            />
          </label>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="mt-6 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 카드 목록 */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : filteredSims.length > 0 ? (
          filteredSims.map((sim) => <SimCard key={sim.id} sim={sim} />)
        ) : (
          <div className="col-span-full flex flex-col items-center py-20 text-center">
            <LayoutGrid className="h-8 w-8 text-zinc-300" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-700">
              {sims.length > 0 ? "조건에 맞는 직무가 없어요" : "아직 준비된 시뮬레이션이 없어요"}
            </h3>
            <p className="mt-2 max-w-xs text-sm text-zinc-400">
              {sims.length > 0
                ? "다른 직무군을 선택하거나 검색어를 바꿔보세요."
                : "곧 기업 시뮬레이션이 추가될 예정이에요. 조금만 기다려 주세요!"}
            </p>
            <Link to="/simulations" className="mt-6">
              <Button className="rounded-md bg-zinc-900 text-white hover:bg-zinc-700">
                추천 보러 가기
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
