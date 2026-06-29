WITH source AS (
  SELECT
    content_mode,
    description,
    duration_min,
    difficulty,
    recommended_for,
    mission_steps,
    summary_title,
    summary_description,
    preview_notice,
    locked_preview_text,
    submitted_competencies,
    wizard_intro_blocks,
    wizard_steps
  FROM public.missions
  WHERE job_slug = 'semiconductor-process'
    AND title = 'FLASH Etch Polymer Particle 이슈 분석'
    AND author_name = 'Beginner 공식'
    AND content_mode = 'step_wizard'
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE public.missions AS target
SET
  content_mode = source.content_mode,
  description = COALESCE(source.description, target.description),
  duration_min = COALESCE(source.duration_min, target.duration_min),
  difficulty = COALESCE(source.difficulty, target.difficulty),
  recommended_for = COALESCE(source.recommended_for, target.recommended_for),
  mission_steps = COALESCE(source.mission_steps, target.mission_steps),
  summary_title = COALESCE(source.summary_title, target.summary_title),
  summary_description = COALESCE(source.summary_description, target.summary_description),
  preview_notice = COALESCE(source.preview_notice, target.preview_notice),
  locked_preview_text = COALESCE(source.locked_preview_text, target.locked_preview_text),
  submitted_competencies = COALESCE(source.submitted_competencies, target.submitted_competencies),
  wizard_intro_blocks = COALESCE(source.wizard_intro_blocks, target.wizard_intro_blocks),
  wizard_steps = COALESCE(source.wizard_steps, target.wizard_steps)
FROM source
WHERE target.job_slug = 'semiconductor-process'
  AND target.is_expert_authored = true
  AND target.author_name <> 'Beginner 공식'
  AND target.title ILIKE 'FLASH Etch Polymer%Particle 이슈 분석%'
  AND (
    target.content_mode IS DISTINCT FROM 'step_wizard'
    OR jsonb_array_length(COALESCE(target.wizard_steps, '[]'::jsonb)) = 0
  );
