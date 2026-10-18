"use client";

import { type MouseEvent, useEffect, useRef } from "react";

import { CloseIcon, PhoneIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import type { EventRecord } from "../event-record";
import type { KamiConfig } from "../kami-config";
import { KamiMark } from "./kami-controls";

function initials(firstName: string, lastName: string) {
  const letters = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase();
  return letters || "?";
}

/** A local preview using the first attendee's event context. No call is placed. */
export function KamiCallModal({
  config,
  event,
  onClose,
  open,
}: {
  config: KamiConfig;
  event: EventRecord;
  onClose: () => void;
  open: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const guest = event.attendees.guests[0] ?? null;
  const name = guest ? `${guest.firstName} ${guest.lastName}`.trim() : "";
  const firstName = guest?.firstName || name;

  // A click that lands on the dialog itself came from the backdrop; the card
  // fills the dialog, so anything inside it hits a child instead.
  const onBackdrop = (click: MouseEvent<HTMLDialogElement>) => {
    if (click.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      aria-labelledby="kami-call-title"
      className="kami-call-modal"
      onClick={onBackdrop}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="kami-call-modal__card">
        <div className="kami-call-modal__head">
          <KamiMark size={46} />
          <div>
            <h2 id="kami-call-title">Call preview</h2>
            <p>An example for {event.name}.</p>
          </div>
          <button
            aria-label="Close"
            className="kami-call-modal__close"
            onClick={onClose}
            type="button"
          >
            <CloseIcon height="15" width="15" />
          </button>
        </div>

        {guest ? (
          <>
            <Surface className="kami-call-modal__guest" depth="inset">
              <span className="kami-call-modal__avatar">
                {initials(guest.firstName, guest.lastName)}
              </span>
              <div>
                <strong>{name || "First guest on the list"}</strong>
                <span>{guest.position || "Attendee"}</span>
                <small>{guest.company || "No company on file"}</small>
              </div>
              <span className="kami-call-modal__status">Preview only</span>
            </Surface>
            <p className="kami-call-modal__copy">
              This example uses {firstName}’s details from the attendee list.
              Previewing does not contact attendees.
            </p>
          </>
        ) : (
          <p className="kami-call-modal__copy">
            Add attendees to see an example using this event’s guest list.
          </p>
        )}

        <div className="kami-call-modal__footer">
          <span className="kami-call-modal__channel" data-enabled={config.channels.calls}>
            <PhoneIcon height="14" width="14" />
            {config.channels.calls ? "Calls included in preview" : "Calls not included in preview"}
          </span>
          <TactileButton onClick={onClose} variant="graphite">Got it</TactileButton>
        </div>
      </div>
    </dialog>
  );
}
