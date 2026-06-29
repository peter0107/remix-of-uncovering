import type { MaterialBlock, Mission, WizardStep } from "@/lib/missions";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

export function isRichTextEmpty(html?: string | null) {
  if (!html) return true;
  const normalized = html
    .replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&nbsp;", " ")
    .trim();
  if (normalized.length > 0) return false;
  return !/<(img|table|ul|ol|blockquote)\b/i.test(html);
}

export function normalizeRichTextHtml(html?: string | null) {
  if (!html) return null;
  const trimmed = html.trim();
  return isRichTextEmpty(trimmed) ? null : trimmed;
}

export function plainTextToRichTextHtml(text?: string | null) {
  if (!text?.trim()) return "";
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function tableToHtml(block: MaterialBlock) {
  if (!block.table || block.table.headers.length === 0) return "";
  const head = block.table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rows = block.table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function blockToHtml(block: MaterialBlock) {
  const title = block.title?.trim() ? `<h3>${escapeHtml(block.title)}</h3>` : "";
  const description = block.description?.trim()
    ? `<p><em>${escapeHtml(block.description)}</em></p>`
    : "";

  let body = "";
  switch (block.type) {
    case "text":
      body = plainTextToRichTextHtml(block.text);
      break;
    case "image":
      body = block.image_url
        ? `<figure><img src="${escapeAttr(block.image_url)}" alt="${escapeAttr(block.image_alt ?? "")}" /></figure>`
        : "";
      break;
    case "table":
      body = tableToHtml(block);
      break;
    case "file":
      body = block.file_url
        ? `<p><a href="${escapeAttr(block.file_url)}" target="_blank" rel="noreferrer">${escapeHtml(block.file_name || "첨부파일 다운로드")}</a></p>`
        : "";
      break;
    case "link":
      body = block.link_url
        ? `<p><a href="${escapeAttr(block.link_url)}" target="_blank" rel="noreferrer">${escapeHtml(block.link_label || block.link_url)}</a></p>`
        : "";
      break;
    default:
      body = "";
  }

  const content = `${title}${description}${body}`.trim();
  return content ? `<section>${content}</section>` : "";
}

export function materialBlocksToRichTextHtml(blocks?: MaterialBlock[] | null) {
  if (!blocks || blocks.length === 0) return "";
  return [...blocks]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((block) => blockToHtml(block))
    .filter(Boolean)
    .join("");
}

export function wizardStepBodyHtml(
  step: Pick<WizardStep, "body_html" | "context_text" | "content_blocks">,
) {
  const bodyHtml = normalizeRichTextHtml(step.body_html);
  if (bodyHtml) return bodyHtml;

  const contextHtml = step.context_text?.trim()
    ? `<section><h3>실제 업무에서는</h3>${plainTextToRichTextHtml(step.context_text)}</section>`
    : "";
  const blocksHtml = materialBlocksToRichTextHtml(step.content_blocks);
  return normalizeRichTextHtml(`${contextHtml}${blocksHtml}`) ?? "";
}

export function missionWizardIntroHtml(
  mission: Pick<Mission, "wizard_intro_html" | "wizard_intro_blocks">,
) {
  return (
    normalizeRichTextHtml(mission.wizard_intro_html) ??
    normalizeRichTextHtml(materialBlocksToRichTextHtml(mission.wizard_intro_blocks)) ??
    ""
  );
}
