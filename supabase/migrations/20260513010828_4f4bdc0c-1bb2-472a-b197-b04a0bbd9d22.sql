
-- App roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'expert', 'user');

-- user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- missions table
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_slug text NOT NULL,
  title text NOT NULL,
  description text,
  situation text,
  data_points jsonb DEFAULT '[]'::jsonb,
  questions jsonb DEFAULT '[]'::jsonb,
  duration_min int NOT NULL DEFAULT 25,
  difficulty text NOT NULL DEFAULT 'medium',
  industries text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT '관리자',
  author_role text DEFAULT '',
  submitted_competencies text[] DEFAULT '{}',
  frequent_tasks text,
  years_experience int,
  industry_categories text[] DEFAULT '{}',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE TRIGGER set_missions_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS policies
CREATE POLICY "Anyone reads published missions" ON public.missions
  FOR SELECT USING (status = 'published');
CREATE POLICY "Authors read own missions" ON public.missions
  FOR SELECT TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Admins read all missions" ON public.missions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users submit missions" ON public.missions
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (status = 'review_pending' OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Admins update missions" ON public.missions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete missions" ON public.missions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed published missions
INSERT INTO public.missions (job_slug, title, description, situation, data_points, questions, duration_min, difficulty, industries, status, author_name, author_role) VALUES
('product-designer', '회원가입 완료율 감소 원인 분석 및 개선 방향 제안',
 '사용자 불편 상황과 간단한 서비스 지표를 보고, 문제를 정의하고 개선 방향을 제안합니다.',
 '최근 2주간 회원가입 완료율이 감소했습니다. 사용자 피드백에서는 가입 과정이 길고, 입력해야 할 정보가 많다는 불만이 반복되고 있습니다.',
 '["회원가입 완료율: 최근 2주간 감소","이탈이 가장 많은 단계: 개인정보 입력 단계","사용자 피드백: 가입 과정이 너무 길다","사용자 피드백: 필수 입력 항목이 많다"]'::jsonb,
 '[{"id":"q1","label":"이 상황에서 핵심 문제는 무엇이라고 생각하나요?"},{"id":"q2","label":"가장 먼저 개선해야 할 지점은 무엇인가요?"},{"id":"q3","label":"그렇게 판단한 이유는 무엇인가요?"},{"id":"q4","label":"추가로 확인하고 싶은 데이터는 무엇인가요?"},{"id":"q5","label":"개선안을 실행했을 때 어떤 지표를 확인해야 하나요?"}]'::jsonb,
 25, 'medium', '{it,service}', 'published', 'Beginner 공식', ''),
('product-designer', '프로젝트 상세페이지 탐색 경험 개선',
 '상세페이지의 정보 구조와 탐색 흐름을 분석하고 개선안을 제시해요.',
 '상세 페이지의 이탈률이 높습니다. 정보 구조와 탐색 흐름을 점검하세요.',
 '["페이지 이탈률 평균 대비 1.4배","스크롤 깊이: 중간 30%"]'::jsonb,
 '[{"id":"q1","label":"가장 먼저 개선할 지점은 어디인가요?"},{"id":"q2","label":"정보 구조를 어떻게 재설계하시겠어요?"}]'::jsonb,
 25, 'medium', '{it,retail}', 'published', 'Beginner 공식', ''),
('uiux-design', '예약 취소율이 높은 화면 흐름 개선',
 '예약 화면에서 취소 이탈이 잦은 흐름을 진단하고 개선 방향을 제안합니다.',
 '예약 페이지에서 결제 직전 단계 이탈률이 높습니다. 사용자들은 옵션 선택이 헷갈린다고 답합니다.',
 '["결제 직전 이탈률: 평균 대비 1.6배","옵션 선택 화면 평균 체류 시간: 12초"]'::jsonb,
 '[{"id":"q1","label":"사용자가 가장 헷갈려 하는 지점은 어디인가요?"},{"id":"q2","label":"어떤 흐름을 먼저 개선하시겠어요?"},{"id":"q3","label":"개선 후 어떤 지표를 보면 효과를 알 수 있나요?"}]'::jsonb,
 25, 'medium', '{it,service}', 'published', 'Beginner 공식', ''),
('semiconductor-process', '특정 공정 단계에서의 수율 저하 원인 추정',
 '공정 데이터와 변경 이력을 보고 수율 저하의 가능 원인을 좁히고 검증 계획을 제안합니다.',
 '지난 주부터 특정 공정 단계의 수율이 평균 대비 3% 하락했습니다.',
 '["공정 단계 A 수율: -3%","장비 B 정기 점검","원자재 공급사 변경"]'::jsonb,
 '[{"id":"q1","label":"가장 의심되는 원인은 무엇인가요?"},{"id":"q2","label":"원인을 좁히기 위해 무엇부터 확인하시겠어요?"}]'::jsonb,
 30, 'hard', '{manufacturing}', 'published', 'Beginner 공식', '');
