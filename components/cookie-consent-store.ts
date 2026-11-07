"use client";

import { useSyncExternalStore } from "react";

export type CookieConsent = "essential" | "analytics" | null;

const storageKey = "school-manager-cookie-consent";
const listeners = new Set<() => void>();
let volatileConsent: CookieConsent = null;

function readConsent(): CookieConsent {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "essential" || stored === "analytics") return stored;
  } catch {
    return volatileConsent;
  }
  return volatileConsent;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useCookieConsent() {
  return useSyncExternalStore(subscribe, readConsent, () => null);
}

export function setCookieConsent(consent: Exclude<CookieConsent, null>) {
  volatileConsent = consent;
  try {
    window.localStorage.setItem(storageKey, consent);
  } catch {
    // Keep the choice for the lifetime of this page if browser storage is disabled.
  }
  listeners.forEach((listener) => listener());
}
