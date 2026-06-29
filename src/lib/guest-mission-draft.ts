import type { Order } from "@/lib/orders";

export type GuestMissionDraft = {
  id: string;
  jobSlug: string;
  missionId: string;
  productId: Order["productId"];
  answers: Record<string, string>;
  createdAt: number;
};

const GUEST_ORDER_PREFIX = "GUEST-";

function storageKey(id: string) {
  return `guest-mission-draft:${id}`;
}

export function isGuestOrderId(orderId: string) {
  return orderId.startsWith(GUEST_ORDER_PREFIX);
}

export function createGuestMissionDraft(input: {
  jobSlug: string;
  missionId: string;
  productId?: Order["productId"];
}) {
  const draft: GuestMissionDraft = {
    id: `${GUEST_ORDER_PREFIX}${Date.now().toString(36).toUpperCase()}`,
    jobSlug: input.jobSlug,
    missionId: input.missionId,
    productId: input.productId ?? "compare",
    answers: {},
    createdAt: Date.now(),
  };

  saveGuestMissionDraft(draft);
  return draft;
}

export function getGuestMissionDraft(orderId: string): GuestMissionDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(storageKey(orderId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GuestMissionDraft;
  } catch {
    return null;
  }
}

export function saveGuestMissionDraft(draft: GuestMissionDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(draft.id), JSON.stringify(draft));
}

export function updateGuestMissionDraftAnswers(orderId: string, answers: Record<string, string>) {
  const draft = getGuestMissionDraft(orderId);
  if (!draft) return null;

  const nextDraft: GuestMissionDraft = {
    ...draft,
    answers,
  };
  saveGuestMissionDraft(nextDraft);
  return nextDraft;
}

export function removeGuestMissionDraft(orderId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(storageKey(orderId));
}

