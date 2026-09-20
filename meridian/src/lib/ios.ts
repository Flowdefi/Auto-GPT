"use client";

/**
 * iOS/native affordances. Everything degrades silently on the web build, so the
 * same bundle runs in Safari, as a home-screen PWA, and inside Capacitor.
 */

type ImpactStyle = "light" | "medium" | "heavy";

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    Haptics?: {
      impact?: (options: { style: string }) => Promise<void>;
      selectionChanged?: () => Promise<void>;
    };
    StatusBar?: {
      setStyle?: (options: { style: string }) => Promise<void>;
      setBackgroundColor?: (options: { color: string }) => Promise<void>;
    };
    Keyboard?: {
      setResizeMode?: (options: { mode: string }) => Promise<void>;
    };
  };
}

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function isNative(): boolean {
  return capacitor()?.isNativePlatform?.() ?? false;
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  if (capacitor()?.getPlatform?.() === "ios") return true;
  const ua = navigator.userAgent;
  const iOsUa = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return iOsUa || iPadOs;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return displayMode || iosStandalone;
}

/** Fires native haptics when available; no-ops in the browser. */
export function haptic(style: ImpactStyle = "light"): void {
  const plugins = capacitor()?.Plugins;
  if (plugins?.Haptics?.impact) {
    void plugins.Haptics.impact({ style: style.toUpperCase() }).catch(() => undefined);
    return;
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const ms = style === "heavy" ? 18 : style === "medium" ? 12 : 6;
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* vibration is best-effort */
    }
  }
}

export function selectionChanged(): void {
  const plugins = capacitor()?.Plugins;
  void plugins?.Haptics?.selectionChanged?.().catch(() => undefined);
}

export function applyStatusBar(theme: "light" | "dark"): void {
  const plugins = capacitor()?.Plugins;
  void plugins?.StatusBar?.setStyle?.({ style: theme === "dark" ? "DARK" : "LIGHT" }).catch(
    () => undefined,
  );
}
