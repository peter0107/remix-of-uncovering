import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useIsAdmin } from "@/hooks/use-admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading, user } = useIsAdmin();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        권한 확인 중...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-primary">로그인이 필요합니다</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            관리자 페이지는 로그인 후 이용할 수 있습니다.
          </p>
          <Link to="/login" search={{ redirect: "/admin" }}>
            <Button className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90">
              로그인하러 가기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-destructive">접근 권한 없음</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            이 페이지는 관리자 전용입니다.
          </p>
          <p className="mt-4 break-all text-xs text-muted-foreground">
            본인 user ID: <span className="font-mono">{user.id}</span>
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

  return <Outlet />;
}
