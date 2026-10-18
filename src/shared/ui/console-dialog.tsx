"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

export function ConsoleDialog({ open, onClose, title, description, busy = false, children }: {
  open: boolean; onClose: () => void; title: string; description?: string; busy?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="console-dialog" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClose={onClose}
    onClick={(event) => { if (event.target === ref.current && !busy) onClose(); }}>
    <div className="console-dialog__card"><header className="console-dialog__header"><div><h2 id={`${id}-title`}>{title}</h2>{description ? <p id={`${id}-description`}>{description}</p> : null}</div><button className="console-dialog__close" type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><CloseIcon height="18" width="18" /></button></header>{children}</div>
  </dialog>;
}
