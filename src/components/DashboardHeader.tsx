"use client";

import {
  MOVEMENT_FORM_OPEN_EVENT,
  OBJECTIVE_EXIT_FORM_OPEN_EVENT,
  REALLOCATION_FORM_OPEN_EVENT,
} from "@/lib/movement-form-prefill";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-high bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
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

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new Event(OBJECTIVE_EXIT_FORM_OPEN_EVENT))
            }
            className="rounded-xl border border-danger/40 px-2.5 py-2.5 text-xs font-bold text-danger transition hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger sm:px-4 sm:text-sm"
          >
            Retirar capital
          </button>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new Event(REALLOCATION_FORM_OPEN_EVENT))
            }
            className="rounded-xl border border-primary/40 px-2.5 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4 sm:text-sm"
          >
            Redistribuir
          </button>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new Event(MOVEMENT_FORM_OPEN_EVENT))
            }
            className="rounded-xl bg-primary px-2.5 py-2.5 text-xs font-bold text-on-primary shadow-[0_4px_16px_rgba(78,222,163,0.2)] transition hover:bg-[#6ffbbe] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4 sm:text-sm"
          >
            Registrar movimiento
          </button>
        </div>
      </div>
    </header>
  );
}
