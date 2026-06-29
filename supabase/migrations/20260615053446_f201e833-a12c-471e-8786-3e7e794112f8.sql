-- Lock down anon access: revoke broad SELECT then grant only safe columns.
REVOKE SELECT ON public.missions FROM anon;
REVOKE SELECT ON public.missions FROM PUBLIC;

GRANT SELECT (
  id, job_slug, job_category, title, description, content_mode, situation,
  data_points, material_blocks, questions, wizard_intro_html, wizard_intro_blocks,
  wizard_steps, duration_min, difficulty, industries, status, author_id,
  is_expert_authored, author_name, author_role, submitted_competencies,
  frequent_tasks, years_experience, industry_categories, summary_title,
  summary_description, recommended_for, included_results, mission_steps,
  preview_notice, locked_preview_text, reviewed_by, company_size, company_name,
  industry, verification_file_url, created_at, updated_at
) ON public.missions TO anon;

-- Authenticated users / service role keep full table access (already granted).
GRANT SELECT ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;