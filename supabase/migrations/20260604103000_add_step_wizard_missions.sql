ALTER TABLE public.missions
ADD COLUMN IF NOT EXISTS content_mode text NOT NULL DEFAULT 'legacy',
ADD COLUMN IF NOT EXISTS wizard_intro_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS wizard_steps jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO public.missions (
  job_slug,
  title,
  description,
  content_mode,
  duration_min,
  difficulty,
  industries,
  status,
  author_name,
  author_role,
  recommended_for,
  mission_steps,
  summary_title,
  summary_description,
  locked_preview_text,
  submitted_competencies,
  wizard_intro_blocks,
  wizard_steps
) VALUES (
  'semiconductor-process',
  'FLASH Etch Polymer Particle 이슈 분석',
  '전공정에서 발생한 Polymer Particle 증가 이슈를 분석하고, 원인 가설부터 실험 설계, 부서 간 실행 판단까지 순서대로 경험합니다.',
  'step_wizard',
  40,
  'hard',
  '{manufacturing}',
  'published',
  'Beginner 공식',
  '반도체 공정기술 엔지니어',
  '반도체 전공정의 데이터 분석, 원인 추정, 부서 간 의사결정 흐름을 체험해보고 싶은 분',
  ARRAY['문제 파악', '원인 추정', '개선 실험 설계', '판단과 실행'],
  'FLASH Etch Polymer Particle 이슈 분석',
  'FLASH Etch 라인에서 발생한 Polymer Particle 증가 이슈를 분석하고, 단계별로 공정기술 엔지니어의 판단 과정을 경험해보세요.',
  '단계별 답변을 모두 작성하면 최종 제출할 수 있어요.',
  ARRAY['A1', 'A3', 'B3', 'D3', 'F2'],
  $$[
    {
      "id": "intro-role",
      "type": "text",
      "title": "시작하기 전에: 반도체 공정기술 엔지니어란?",
      "description": "",
      "order": 0,
      "text": "반도체는 설계 -> 전공정(패턴 형성) -> 후공정(조립/패키징) -> 테스트를 거쳐 만들어집니다. 이 중 전공정은 웨이퍼 위에 수십~수백 개의 초미세 회로를 만들어내는 과정입니다.\n\n공정기술 엔지니어는 이 전공정이 안정적으로 돌아가도록 관리하는 사람입니다. 매일 하는 일은 크게 세 가지입니다.\n\n1. 데이터를 보고 이상을 감지한다.\n2. 원인을 분석하고 개선한다.\n3. 부서 간 소통하며 의사결정한다.\n\n오늘 시뮬레이션에서는 이 세 가지를 순서대로 경험해봅니다."
    },
    {
      "id": "intro-background",
      "type": "text",
      "title": "배경 지식: 이 시뮬레이션에서 다루는 것",
      "description": "",
      "order": 1,
      "text": "FLASH는 스마트폰, SSD, USB 등에 들어가는 비휘발성 메모리 반도체입니다.\n\nEtch는 웨이퍼 위 막(Film)을 원하는 패턴대로 깎아내는 공정입니다. 이 과정에서 남겨야 할 부분의 폭(CD)과 두께(잔막)가 정확해야 하고, 깎아낸 찌꺼기(Polymer)가 깨끗이 제거되어야 합니다.\n\nEtch 공정에서 생긴 Polymer가 Cleaning 단계에서 제대로 제거되지 않으면 Particle(미세 입자)로 남고, 이는 최종 수율 저하로 이어질 수 있습니다."
    },
    {
      "id": "intro-terms",
      "type": "table",
      "title": "주요 용어 정리",
      "description": "",
      "order": 2,
      "table": {
        "headers": ["용어", "의미"],
        "rows": [
          ["CD (Critical Dimension)", "패턴의 폭. 설계대로 정확히 깎였는지를 나타내는 핵심 치수"],
          ["잔막 두께", "Etch 후 남아있는 막의 두께. 너무 많이 깎이면 얇아지고, 덜 깎이면 두꺼워짐"],
          ["Particle", "웨이퍼 표면의 미세 이물질. 많을수록 불량 가능성 증가"],
          ["수율 (Yield)", "전체 생산량 중 양품의 비율. 반도체 공장의 핵심 성과 지표"],
          ["Lot", "동일 조건으로 한꺼번에 처리되는 웨이퍼 묶음 (보통 25장)"],
          ["Recipe", "공정 장비에 설정된 처리 조건 (온도, 시간, 가스 등의 조합)"],
          ["Chamber", "실제 웨이퍼가 들어가서 처리되는 장비 내부 공간"]
        ]
      }
    }
  ]$$::jsonb,
  $$[
    {
      "id": "step-1",
      "title": "Step 1. 문제 파악",
      "duration_min": 15,
      "context_text": "공정 엔지니어의 하루는 대부분 이런 메일을 받는 것으로 시작됩니다. 먼저 무엇이 정상이고 무엇이 비정상인지 기준을 확인하고, MES에서 Lot별 데이터를 꺼내 패턴을 찾는 것이 핵심입니다.\n\n보통 장비별 비교, Cleaning 조건별 비교, Particle과 수율의 관계를 함께 확인합니다.",
      "content_blocks": [
        {
          "id": "step1-role",
          "type": "text",
          "title": "당신의 역할",
          "description": "",
          "order": 0,
          "text": "당신은 FLASH 제품 양산 라인의 Etch 공정 담당 엔지니어입니다. 이 라인에서는 Etch 장비 3대(E-01, E-02, E-03)가 돌아가고 있고, 매일 1,200장의 웨이퍼를 생산해야 합니다.\n\n오늘 아침 품질팀에서 최근 특정 Etch 공정 이후 Polymer Particle이 증가했고, 해당 Lot의 최종 수율도 낮아졌다는 분석 메일을 보냈습니다."
        },
        {
          "id": "step1-spec",
          "type": "table",
          "title": "품질 통과 기준",
          "description": "",
          "order": 1,
          "table": {
            "headers": ["항목", "기준", "의미"],
            "rows": [
              ["CD Target", "42nm ± 2nm", "패턴 폭이 40~44nm 사이여야 정상"],
              ["Etch 후 잔막 두께", "18nm ± 1.5nm", "남은 막 두께가 16.5~19.5nm 사이여야 정상"],
              ["Polymer Particle", "30ea 이하", "웨이퍼 1장당 Particle이 30개 이하여야 정상"],
              ["최종 수율", "92% 이상", "양품 비율이 92% 이상이어야 정상"],
              ["일일 생산 목표", "1,200 wafer/day", "하루에 1,200장을 생산해야 함"]
            ]
          }
        },
        {
          "id": "step1-lots",
          "type": "table",
          "title": "최근 Lot 데이터",
          "description": "",
          "order": 2,
          "table": {
            "headers": ["Lot", "제품", "장비", "Recipe", "Cleaning", "CD", "잔막 두께", "Particle", "최종 수율"],
            "rows": [
              ["L01", "FLASH-A", "E-01", "R1", "C1", "42.1nm", "18.3nm", "18ea", "94.1%"],
              ["L02", "FLASH-A", "E-02", "R1", "C1", "41.8nm", "18.1nm", "22ea", "93.5%"],
              ["L03", "FLASH-A", "E-03", "R1", "C1", "42.4nm", "18.4nm", "68ea", "88.2%"],
              ["L04", "FLASH-A", "E-03", "R1", "C1", "42.6nm", "18.5nm", "74ea", "87.9%"],
              ["L05", "FLASH-A", "E-01", "R1", "C2", "42.0nm", "18.2nm", "20ea", "94.0%"],
              ["L06", "FLASH-B", "E-03", "R1", "C1", "41.9nm", "18.0nm", "81ea", "86.5%"],
              ["L07", "FLASH-B", "E-02", "R1", "C1", "42.2nm", "18.2nm", "31ea", "91.8%"],
              ["L08", "FLASH-A", "E-03", "R1", "C2", "42.3nm", "18.3nm", "39ea", "91.6%"]
            ]
          }
        }
      ],
      "prompts": [
        {
          "id": "out-of-spec",
          "label": "기준을 벗어난 항목과 왜 이 문제가 빨리 해결되어야 하는지 정리해보세요.",
          "guide": "Spec 초과/미달 항목과 생산/품질 관점의 리스크를 함께 적어주세요.",
          "input_type": "textarea"
        },
        {
          "id": "patterns",
          "label": "데이터에서 발견한 경향(패턴)을 최소 3가지 적어보세요.",
          "guide": "장비별, Cleaning 조건별, Particle과 수율 관계를 비교해보세요.",
          "input_type": "textarea"
        }
      ]
    },
    {
      "id": "step-2",
      "title": "Step 2. 원인 추정",
      "duration_min": 5,
      "context_text": "패턴을 찾았다면 가능한 원인을 여러 방향으로 세우고, 가장 가능성 높은 가설을 좁혀가야 합니다. 장비, 공정 조건, 재료, 환경 가운데 어디가 원인인지 데이터를 근거로 판단하는 사고방식이 중요합니다.",
      "content_blocks": [
        {
          "id": "step2-cleaning",
          "type": "table",
          "title": "Cleaning 조건 상세",
          "description": "",
          "order": 0,
          "table": {
            "headers": ["Cleaning Step", "설명"],
            "rows": [
              ["C1", "기존 Cleaning 조건 (현재 기본 적용)"],
              ["C2", "Cleaning 시간 15% 증가"],
              ["C3", "Cleaning 시간 15% 증가 + Gas Flow 조정 (아직 미적용)"]
            ]
          }
        }
      ],
      "prompts": [
        {
          "id": "hypotheses",
          "label": "Polymer Particle이 증가한 원인의 가설을 최소 3가지 적어보세요.",
          "guide": "반드시 Lot 데이터에서 발견한 패턴을 근거로 적어주세요. 예: L03~L06에서 E-03에 집중되어 있으므로 ...",
          "input_type": "textarea"
        }
      ]
    },
    {
      "id": "step-3",
      "title": "Step 3. 개선 실험 설계",
      "duration_min": 10,
      "context_text": "가설을 세웠다면 검증 실험을 설계해야 합니다. Particle을 줄이면서도 CD와 잔막 두께가 Spec을 벗어나지 않는지 함께 봐야 하고, 최소한의 Lot으로 최대한의 정보를 얻는 설계가 중요합니다.",
      "content_blocks": [
        {
          "id": "step3-balance",
          "type": "text",
          "title": "실험 설계 시 유의할 점",
          "description": "",
          "order": 0,
          "text": "Cleaning 조건을 바꿔 Particle을 줄여도 CD나 잔막 두께가 Spec을 벗어나면 다른 불량이 생길 수 있습니다. 공정 엔지니어는 항상 '이걸 바꾸면 저게 어떻게 되지?'를 같이 생각해야 합니다.\n\n또한 실험에 쓰는 웨이퍼도 비용이기 때문에, 적은 Lot으로 핵심 가설을 검증할 수 있게 설계해야 합니다."
        }
      ],
      "prompts": [
        {
          "id": "experiment-plan",
          "label": "Polymer Particle을 줄이기 위한 개선 실험 계획을 작성해보세요.",
          "guide": "어떤 조건을 바꿀지, 어떤 장비에서, 몇 개 Lot으로 테스트할지, CD/잔막 두께 확인 방법, 성공/실패 기준까지 포함해주세요.",
          "input_type": "textarea"
        }
      ]
    },
    {
      "id": "step-4",
      "title": "Step 4. 판단과 실행",
      "duration_min": 10,
      "context_text": "현장에서는 실험 결과를 기다리는 동안에도 생산과 품질 사이에서 운영 판단을 내려야 합니다. 결정을 내렸다면 각 부서에 무엇을, 언제까지, 어떤 기준으로 확인할지 구체적으로 요청해야 실제로 일이 움직입니다.",
      "content_blocks": [
        {
          "id": "step4-stakeholders",
          "type": "table",
          "title": "각 부서의 입장",
          "description": "",
          "order": 0,
          "table": {
            "headers": ["부서", "입장"],
            "rows": [
              ["생산팀", "E-03은 전체 생산량의 25%를 담당하고 있어 멈추면 오늘 목표 1,200 wafer 달성이 어려움"],
              ["품질팀", "Particle 기준 초과 Lot이 후속 공정으로 가면 불량 확산과 고객 클레임 리스크가 커짐"],
              ["공정개발팀", "C2로 변경하면 Particle 감소 가능성은 있지만 CD/잔막 영향은 충분히 검증되지 않음"],
              ["장비팀", "고장 알람은 없지만 문제가 반복되어 Chamber 상태와 최근 PM 이력 추가 확인 필요"]
            ]
          }
        }
      ],
      "prompts": [
        {
          "id": "run-decision",
          "label": "E-03 장비를 어떻게 운영하시겠습니까?",
          "guide": "생산과 품질 사이에서 어떤 리스크를 감수하고 어떤 리스크를 피하는지 생각해보세요.",
          "input_type": "single_select",
          "options": [
            {
              "id": "continue-run",
              "label": "계속 Run",
              "description": "기존 조건(C1) 그대로 생산 계속"
            },
            {
              "id": "limited-run",
              "label": "제한 Run",
              "description": "조건을 변경(예: C2 적용)해서 제한적 생산"
            },
            {
              "id": "hold",
              "label": "일시 Hold",
              "description": "생산 중단 후 장비 점검과 원인 확인 뒤 재가동"
            }
          ]
        },
        {
          "id": "decision-reason",
          "label": "위 판단을 내린 이유를 적어보세요.",
          "guide": "생산/품질/개발/장비 관점의 근거를 함께 적어주세요.",
          "input_type": "textarea"
        },
        {
          "id": "cross-team-requests",
          "label": "생산팀, 품질팀, 장비팀, 공정개발팀에 각각 무엇을 요청할지 구체적으로 적어보세요.",
          "guide": "'무엇을', '어떻게', '언제까지' 확인해달라고 요청할지 부서별로 나눠 작성해주세요.",
          "input_type": "textarea"
        }
      ]
    }
  ]$$::jsonb
);
