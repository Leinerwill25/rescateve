import type { AshDraft } from "@/lib/ash-flow";

const DRAFT_KEY = "rescate_ve_ash_draft";

export function loadAshDraft(): AshDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AshDraft;
  } catch {
    return null;
  }
}

export function saveAshDraft(draft: AshDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearAshDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}
