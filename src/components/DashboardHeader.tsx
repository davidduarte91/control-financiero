"use client";

import { MOVEMENT_FORM_OPEN_EVENT } from "@/lib/movement-form-prefill";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-high bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-surface-highest font-mono text-sm font-bold text-primary"
          >
            CF
          </div>
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight text-on-surface">
              Control financiero
            </p>
            <p className="text-xs text-on-surface-muted">
              Inversiones y objetivos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(MOVEMENT_FORM_OPEN_EVENT))}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-[0_4px_16px_rgba(78,222,163,0.2)] transition hover:bg-[#6ffbbe] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Registrar movimiento
        </button>
      </div>
    </header>
  );
}
