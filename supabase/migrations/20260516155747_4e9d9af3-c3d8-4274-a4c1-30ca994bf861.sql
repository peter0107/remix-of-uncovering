ALTER TABLE public.custom_jobs ADD COLUMN IF NOT EXISTS required_competencies text[] NOT NULL DEFAULT '{}';

UPDATE public.custom_jobs SET required_competencies = ARRAY['A1','A7','B2','B3','B6','E1'] WHERE slug = 'product-designer';
UPDATE public.custom_jobs SET required_competencies = ARRAY['A1','A7','B1','B2','B3','B6'] WHERE slug = 'uiux-design';
UPDATE public.custom_jobs SET required_competencies = ARRAY['A1','B1','B2','B3','F2','F4'] WHERE slug = 'service-pm';
UPDATE public.custom_jobs SET required_competencies = ARRAY['A1','A7','A2','A3','A4','A5'] WHERE slug = 'data-analytics';
UPDATE public.custom_jobs SET required_competencies = ARRAY['A1','B1','F2','F4','H1','I3'] WHERE slug = 'bx-brand-design';
UPDATE public.custom_jobs SET required_competencies = ARRAY['A3','A4','A5','C1','D4','I5'] WHERE slug = 'semiconductor-process';
UPDATE public.custom_jobs SET required_competencies = ARRAY['A2','A3','A4','C1','D4','I5'] WHERE slug = 'pharma-qc';