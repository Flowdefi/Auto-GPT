"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { portalCopy, type PortalCopy, type PortalLang } from "@/lib/collections/portal-copy";

const PortalLangContext = createContext<{ lang: PortalLang; copy: PortalCopy; setLang: (lang: PortalLang) => void } | null>(null);

export function usePortalCopy(): PortalCopy {
  const context = useContext(PortalLangContext);
  return context?.copy ?? portalCopy.en;
}

export function PortalFrame({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const [lang, setLang] = useState<PortalLang>(params.get("lang") === "es" ? "es" : "en");

  useEffect(() => {
    const query = params.get("lang");
    if (query === "es" || query === "en") {
      setLang(query);
      return;
    }
    const stored = window.localStorage.getItem("meridian_portal_lang");
    if (stored === "es" || stored === "en") setLang(stored);
  }, [params]);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem("meridian_portal_lang", lang);
  }, [lang]);

  const copy = portalCopy[lang];
  const [brandName, setBrandName] = useState("{{agency_name}}");
  const [brandColor, setBrandColor] = useState("#1c2430");
  useEffect(() => {
    void fetch("/api/brand")
      .then((response) => response.json())
      .then((body: { brand?: { name?: string; color?: string } }) => {
        if (body.brand?.name) setBrandName(body.brand.name);
        if (body.brand?.color) setBrandColor(body.brand.color);
      })
      .catch(() => undefined);
  }, []);
  return (
    <PortalLangContext.Provider value={{ lang, copy, setLang }}>
      <div className="portal-shell bg-white text-[#1c2430]" style={{ ["--agency" as string]: brandColor }}>
        <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2" href="#portal-main">
          {copy.skip}
        </a>
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-6 pt-6 text-sm">
          <p><span style={{ color: brandColor }}>{brandName}</span>. {copy.counsel} <a className="inline-flex min-h-11 items-center underline" href="/agency">{copy.agencySite}</a></p>
          <div role="group" aria-label={copy.language} className="flex shrink-0 gap-2">
            <button type="button" className="min-h-11 underline" aria-pressed={lang === "en"} onClick={() => setLang("en")}>{copy.english}</button>
            <button type="button" className="min-h-11 underline" aria-pressed={lang === "es"} onClick={() => setLang("es")}>{copy.spanish}</button>
          </div>
        </div>
        <div id="portal-main">{children}</div>
      </div>
    </PortalLangContext.Provider>
  );
}
