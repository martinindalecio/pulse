"use client";

import { useEffect, useState } from "react";
import { LanguageToggle, useLang } from "@/lib/i18n";

const ACCESS_CODE_KEY = "pulse-access-code";

export function useAccessCode() {
  // `null` means "haven't looked at sessionStorage yet". Reading it during render would make the
  // server (which always sees no code) disagree with an already-unlocked client, and React treats
  // that as a hydration failure — a red error overlay on every page load.
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    setAccessCode(sessionStorage.getItem(ACCESS_CODE_KEY) ?? "");
  }, []);

  const setCode = (code: string) => {
    sessionStorage.setItem(ACCESS_CODE_KEY, code);
    setAccessCode(code);
    setUnauthorized(false);
  };

  // Call when a request comes back 401 — clears the stored code and re-shows the gate.
  const reject = () => {
    sessionStorage.removeItem(ACCESS_CODE_KEY);
    setAccessCode("");
    setUnauthorized(true);
  };

  return {
    accessCode: accessCode ?? "",
    /** False until sessionStorage has been read — render nothing rather than flash the gate. */
    ready: accessCode !== null,
    unauthorized,
    setCode,
    reject,
  };
}

export function AccessGate({
  unauthorized,
  onSubmit,
}: {
  unauthorized: boolean;
  onSubmit: (code: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const { t } = useLang();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(draft.trim());
        }}
        className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Pulse</h1>
          <LanguageToggle />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {unauthorized ? t("gate.wrong") : t("gate.prompt")}
        </p>
        <input
          autoFocus
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-950 outline-none dark:border-zinc-700 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
        >
          {t("gate.unlock")}
        </button>
      </form>
    </div>
  );
}
