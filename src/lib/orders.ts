import { supabase } from "@/integrations/supabase/client";

export type OrderStatus =
  | "payment_pending"
  | "in_progress"
  | "submitted"
  | "report_pending"
  | "report_ready"
  | "feedback_ready";

export type ShareVerificationStatus = "none" | "pending" | "approved" | "rejected";

export type Evaluation = {
  competencyScores: Record<string, number>;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
  expertComment: string;
  missionIntro?: string;
  fitNarrative?: string;
  fitPoints?: string[];
};

export type Order = {
  id: string;
  userId?: string | null;
  email: string;
  jobSlug: string;
  missionId?: string | null;
  productId: "single" | "compare" | "feedback" | "summary";
  status: OrderStatus;
  createdAt: number;
  answers?: Record<string, string>;
  submittedAt?: number;
  feedbackRequested?: boolean;
  competencyScores?: Record<string, number>;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
  expertComment?: string;
  missionIntro?: string;
  fitNarrative?: string;
  fitPoints?: string[];
  shareVerificationStatus?: ShareVerificationStatus;
  shareVerificationImagePath?: string | null;
  shareVerificationImageName?: string | null;
  shareVerificationSubmittedAt?: number;
  shareVerificationReviewedAt?: number;
  shareVerificationRejectionNote?: string | null;
};

type Row = {
  id: string;
  user_id: string | null;
  email: string;
  job_slug: string;
  mission_id: string | null;
  product_id: string;
  status: string;
  answers: Record<string, string> | null;
  submitted_at: string | null;
  feedback_requested: boolean;
  created_at: string;
  competency_scores?: Record<string, number> | null;
  strengths?: string[] | null;
  improvements?: string[] | null;
  next_actions?: string[] | null;
  expert_comment?: string | null;
  mission_intro?: string | null;
  fit_narrative?: string | null;
  fit_points?: string[] | null;
  share_verification_status?: string | null;
  share_verification_image_path?: string | null;
  share_verification_image_name?: string | null;
  share_verification_submitted_at?: string | null;
  share_verification_reviewed_at?: string | null;
  share_verification_rejection_note?: string | null;
};

function fromRow(r: Row): Order {
  return {
    id: r.id,
    userId: r.user_id,
    email: r.email,
    jobSlug: r.job_slug,
    missionId: r.mission_id ?? null,
    productId: r.product_id as Order["productId"],
    status: r.status as OrderStatus,
    answers: r.answers ?? undefined,
    submittedAt: r.submitted_at ? new Date(r.submitted_at).getTime() : undefined,
    feedbackRequested: r.feedback_requested,
    createdAt: new Date(r.created_at).getTime(),
    competencyScores: (r.competency_scores as Record<string, number>) ?? {},
    strengths: r.strengths ?? [],
    improvements: r.improvements ?? [],
    nextActions: r.next_actions ?? [],
    expertComment: r.expert_comment ?? "",
    missionIntro: r.mission_intro ?? "",
    fitNarrative: r.fit_narrative ?? "",
    fitPoints: r.fit_points ?? [],
    shareVerificationStatus: (r.share_verification_status as ShareVerificationStatus | null) ?? "none",
    shareVerificationImagePath: r.share_verification_image_path ?? null,
    shareVerificationImageName: r.share_verification_image_name ?? null,
    shareVerificationSubmittedAt: r.share_verification_submitted_at
      ? new Date(r.share_verification_submitted_at).getTime()
      : undefined,
    shareVerificationReviewedAt: r.share_verification_reviewed_at
      ? new Date(r.share_verification_reviewed_at).getTime()
      : undefined,
    shareVerificationRejectionNote: r.share_verification_rejection_note ?? null,
  };
}

export async function saveEvaluation(id: string, evaluation: Evaluation) {
  const { error } = await supabase
    .from("orders")
    .update({
      competency_scores: evaluation.competencyScores,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      next_actions: evaluation.nextActions,
      expert_comment: evaluation.expertComment,
      mission_intro: evaluation.missionIntro ?? null,
      fit_narrative: evaluation.fitNarrative ?? null,
      fit_points: evaluation.fitPoints ?? [],
      status: "report_ready",
    } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listOrders error", error);
    return [];
  }
  return (data as unknown as Row[]).map(fromRow);
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return fromRow(data as unknown as Row);
}

export async function createOrder(input: {
  email: string;
  jobSlug: string;
  productId: Order["productId"];
  missionId?: string | null;
  status?: OrderStatus;
}): Promise<Order> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("로그인이 필요합니다.");

  const id = `BG-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase
    .from("orders")
    .insert({
      id,
      user_id: user.id,
      email: input.email || user.email || "",
      job_slug: input.jobSlug,
      mission_id: input.missionId ?? null,
      product_id: input.productId,
      status: input.status ?? "in_progress",
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as unknown as Row);
}

type OrderPatch = {
  status?: OrderStatus;
  answers?: Record<string, string>;
  feedbackRequested?: boolean;
  submittedAt?: number | null;
  shareVerificationStatus?: ShareVerificationStatus;
  shareVerificationImagePath?: string | null;
  shareVerificationImageName?: string | null;
  shareVerificationSubmittedAt?: number | null;
  shareVerificationReviewedAt?: number | null;
  shareVerificationRejectionNote?: string | null;
};

export async function updateOrder(id: string, patch: OrderPatch) {
  const update: {
    status?: string;
    answers?: Record<string, string>;
    feedback_requested?: boolean;
    submitted_at?: string | null;
    share_verification_status?: string;
    share_verification_image_path?: string | null;
    share_verification_image_name?: string | null;
    share_verification_submitted_at?: string | null;
    share_verification_reviewed_at?: string | null;
    share_verification_rejection_note?: string | null;
  } = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.answers !== undefined) update.answers = patch.answers;
  if (patch.feedbackRequested !== undefined)
    update.feedback_requested = patch.feedbackRequested;
  if (patch.submittedAt !== undefined)
    update.submitted_at = patch.submittedAt ? new Date(patch.submittedAt).toISOString() : null;
  if (patch.shareVerificationStatus !== undefined)
    update.share_verification_status = patch.shareVerificationStatus;
  if (patch.shareVerificationImagePath !== undefined)
    update.share_verification_image_path = patch.shareVerificationImagePath;
  if (patch.shareVerificationImageName !== undefined)
    update.share_verification_image_name = patch.shareVerificationImageName;
  if (patch.shareVerificationSubmittedAt !== undefined)
    update.share_verification_submitted_at = patch.shareVerificationSubmittedAt
      ? new Date(patch.shareVerificationSubmittedAt).toISOString()
      : null;
  if (patch.shareVerificationReviewedAt !== undefined)
    update.share_verification_reviewed_at = patch.shareVerificationReviewedAt
      ? new Date(patch.shareVerificationReviewedAt).toISOString()
      : null;
  if (patch.shareVerificationRejectionNote !== undefined)
    update.share_verification_rejection_note = patch.shareVerificationRejectionNote;

  const { error } = await supabase.from("orders").update(update).eq("id", id);
  if (error) throw error;
}

export async function saveAnswers(id: string, answers: Record<string, string>) {
  await updateOrder(id, { answers });
}

export async function upgradeOrderToCompare(id: string) {
  const { error } = await supabase
    .from("orders")
    .update({ product_id: "compare" } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function upgradeOrderToFeedback(id: string) {
  const { error } = await supabase
    .from("orders")
    .update({ product_id: "feedback" } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function submitOrder(id: string, answers: Record<string, string>) {
  await updateOrder(id, {
    answers,
    status: "report_pending",
    submittedAt: Date.now(),
  });

  try {
    await fetch("/api/public/order-submitted-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: id }),
    });
  } catch (error) {
    console.error("[email] failed to trigger order submission notify", error);
  }
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  payment_pending: "결제 확인 중",
  in_progress: "시뮬레이션 진행 중",
  submitted: "제출 완료",
  report_pending: "리포트 준비 중",
  report_ready: "리포트 확인 가능",
  feedback_ready: "피드백 확인 가능",
};
