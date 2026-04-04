import { useEffect, useRef, useCallback } from "react";
import { UseFormReturn, FieldValues } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

interface UseDraftFormOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  /** Unique key like "event-new" or "venue-abc123" */
  draftKey: string;
  /** Debounce interval in ms (default 1000) */
  debounceMs?: number;
  /** Called after server data is loaded — draft restores on top */
  enabled?: boolean;
}

const DRAFT_PREFIX = "wujha_draft_";

function getDraftKey(key: string) {
  return `${DRAFT_PREFIX}${key}`;
}

export function clearDraft(draftKey: string) {
  try {
    sessionStorage.removeItem(getDraftKey(draftKey));
  } catch {}
}

export function useDraftForm<T extends FieldValues>({
  form,
  draftKey,
  debounceMs = 1000,
  enabled = true,
}: UseDraftFormOptions<T>) {
  const { toast } = useToast();
  const storageKey = getDraftKey(draftKey);
  const restoredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Restore draft once after server data has been loaded
  const restoreDraft = useCallback(() => {
    if (!enabled || restoredRef.current) return false;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return false;
      const saved = JSON.parse(raw) as { values: T; timestamp: number };
      // Only restore if saved within last 4 hours
      if (Date.now() - saved.timestamp > 4 * 60 * 60 * 1000) {
        sessionStorage.removeItem(storageKey);
        return false;
      }
      form.reset(saved.values, { keepDefaultValues: true });
      toast({ title: "Draft restored", description: "Your unsaved changes were recovered." });
      return true;
    } catch {
      return false;
    }
  }, [storageKey, enabled]);

  // Watch form and persist to sessionStorage (debounced)
  useEffect(() => {
    if (!enabled) return;

    const subscription = form.watch((values) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Only save if user has made changes
        if (form.formState.isDirty) {
          try {
            sessionStorage.setItem(
              storageKey,
              JSON.stringify({ values, timestamp: Date.now() })
            );
          } catch {}
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form, storageKey, debounceMs, enabled]);

  // Warn before unload
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.formState.isDirty, enabled]);

  const clear = useCallback(() => {
    try { sessionStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  return { restoreDraft, clearDraft: clear };
}
