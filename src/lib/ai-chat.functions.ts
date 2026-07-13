import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function getBearerToken(): string {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("로그인이 필요해요.");
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    throw new Error("로그인이 필요해요.");
  }
  return token;
}

function createPublicServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Backend is not configured");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function assertJobSeeker() {
  const token = getBearerToken();
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("로그인이 필요해요.");
  }
  return data.user;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getClaudeText(payload: Record<string, unknown>): string {
  const content = payload.content;
  if (!Array.isArray(content)) return "";
  return content
    .flatMap((part) =>
      typeof part === "object" &&
      part !== null &&
      (part as { type?: unknown }).type === "text" &&
      typeof (part as { text?: unknown }).text === "string"
        ? [(part as { text: string }).text]
        : [],
    )
    .join("\n")
    .trim();
}

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const chatInputSchema = z.object({
  simulationId: z.string().uuid(),
  messages: z.array(chatMessageSchema).min(1).max(50),
});

export type SimulationChatReply = {
  reply: string;
};

async function loadSimulationContext(simulationId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("job_simulations")
    .select("title, task_prompt, single_answer_question")
    .eq("id", simulationId)
    .eq("is_public", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Failed to load simulation context for chat:", error);
    throw new Error("과제 정보를 불러오지 못했어요.");
  }
  if (!data) {
    throw new Error("과제를 찾을 수 없어요.");
  }

  const title = (data.title ?? "").trim();
  const taskPrompt = stripHtml(data.task_prompt ?? "").slice(0, 6000);
  const question = stripHtml(data.single_answer_question ?? "").slice(0, 2000);

  return [
    title ? `과제 제목: ${title}` : "",
    taskPrompt ? `과제 설명:\n${taskPrompt}` : "",
    question ? `핵심 질문:\n${question}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const chatWithSimulationAssistant = createServerFn({ method: "POST" })
  .inputValidator(chatInputSchema)
  .handler(async ({ data }): Promise<SimulationChatReply> => {
    await assertJobSeeker();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("AI 어시스트가 아직 준비 중이에요. 잠시 후 다시 시도해 주세요.");
    }

    const context = await loadSimulationContext(data.simulationId);

    const systemPrompt = `당신은 구직자가 직무 시뮬레이션 과제를 수행하도록 돕는 AI 어시스트입니다.
- 답안을 대신 작성하지 말고, 과제 이해와 접근 방법을 돕는 방향으로 답하세요.
- 구직자가 스스로 사고하도록 힌트와 질문을 활용하세요.
- 한국어 해요체로, 간결하고 친절하게 답하세요.

아래는 구직자가 현재 수행 중인 과제의 맥락입니다.
${context}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error !== null &&
        typeof (payload.error as { message?: unknown }).message === "string"
          ? (payload.error as { message: string }).message
          : "AI 응답을 받지 못했어요.";
      console.error("Simulation chat request failed:", message);
      throw new Error("AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.");
    }

    const reply = getClaudeText(payload);
    if (!reply) {
      throw new Error("AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.");
    }

    return { reply };
  });
