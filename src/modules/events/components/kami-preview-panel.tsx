"use client";

import Image from "next/image";
import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from "react";

import { CityArtwork, type CityArt } from "@/shared/ui/city-artwork";
import {
  ChevronRightIcon,
  EyeIcon,
  OutcomesIcon,
  PeopleIcon,
  RefreshIcon,
  SendIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import type { EventRecord } from "../event-record";
import { activeChannelLabel, KAMI_TONES, type KamiConfig } from "../kami-config";
import {
  buildGuestMessage,
  buildKamiConversation,
  buildKamiFollowUp,
  countActiveContext,
  kamiInstructionSummary,
  type KamiPreviewMessage,
  type KamiPreviewScenario,
} from "../kami-preview";
import { KamiMark } from "./kami-controls";

function MessageRow({ index, message }: { index: number; message: KamiPreviewMessage }) {
  const isKami = message.author === "kami";

  return (
    <div
      className={`kami-message kami-message--${message.author}`}
      style={{ "--message-index": index } as CSSProperties}
    >
      <p className="kami-message__meta">
        <strong>{isKami ? "Kami" : "You"}</strong>
        <time>{message.time}</time>
      </p>
      <div className="kami-message__body">
        {isKami ? <KamiMark size={26} /> : null}
        <div className="kami-bubble">
          {message.lines.map((line, line_index) => (
            <span key={`${message.id}-${line_index}`}>{line}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The example exchange. Remounted by its key whenever the scenario changes or the
 * organizer replays the preview, so the conversation always starts over.
 */
function KamiConversation({
  config,
  onScenarioChange,
  scenario,
}: {
  config: KamiConfig;
  onScenarioChange: () => void;
  scenario: KamiPreviewScenario;
}) {
  const [followUps, setFollowUps] = useState<KamiPreviewMessage[]>([]);
  const [draft, setDraft] = useState("");

  const messages = [...buildKamiConversation(config, scenario), ...followUps];
  const suggestionShown = followUps.length === 0;
  const instructionSummary = kamiInstructionSummary(config);

  const reply = (text: string) => {
    if (text === "Show someone else") {
      onScenarioChange();
      return;
    }
    const intent = text === "Introduce us" ? "introduce" : "detail";
    setFollowUps([
      buildGuestMessage(`${scenario.id}-${intent}-guest`, text),
      buildKamiFollowUp(scenario, intent),
    ]);
  };

  const send = (submit: FormEvent) => {
    submit.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setFollowUps([
      buildGuestMessage(`${scenario.id}-custom-guest`, text),
      buildKamiFollowUp(scenario, "custom"),
    ]);
    setDraft("");
  };

  return (
    <>
      <div className="kami-thread">
        {messages.map((message, index) => (
          <MessageRow index={index} key={message.id} message={message} />
        ))}

        {suggestionShown ? (
          <>
            <Surface
              className="kami-suggestion"
              depth="floating"
              style={{ "--message-index": messages.length } as CSSProperties}
            >
              <Surface className="kami-suggestion__portrait" depth="inset" aria-hidden="true"><PeopleIcon height="20" width="20" /></Surface>
              <div>
                <strong>{scenario.suggestion.name}</strong>
                <span>{scenario.suggestion.role}</span>
                <small>{scenario.suggestion.company}</small>
              </div>
              <ChevronRightIcon height="16" width="16" />
            </Surface>

            <div className="kami-replies">
              {scenario.replies.map((text, index) => (
                <button
                  className="kami-reply"
                  key={text}
                  onClick={() => reply(text)}
                  style={{ "--message-index": messages.length + index + 1 } as CSSProperties}
                  type="button"
                >
                  {text}
                </button>
              ))}
            </div>
          </>
        ) : (
          <button
            className="kami-restart"
            onClick={() => {
              setFollowUps([]);
              setDraft("");
            }}
            style={{ "--message-index": messages.length } as CSSProperties}
            type="button"
          >
            <RefreshIcon height="13" width="13" /> Restart conversation
          </button>
        )}
      </div>

      {instructionSummary ? (
        <p className="kami-preview__note">Following your instructions: {instructionSummary}</p>
      ) : null}

      <form className="kami-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="kami-composer-input">Message Kami</label>
        <input
          autoComplete="off"
          className="event-control kami-composer__input"
          id="kami-composer-input"
          onChange={(input) => setDraft(input.target.value)}
          placeholder="Type a message…"
          value={draft}
        />
        <TactileButton
          aria-label="Send preview message"
          className="kami-composer__send"
          disabled={draft.trim() === ""}
          iconOnly
          type="submit"
        >
          <SendIcon height="16" width="16" />
        </TactileButton>
      </form>
    </>
  );
}

export function KamiPreviewPanel({
  art,
  config,
  event,
  onScenarioChange,
  replayToken,
  scenario,
}: {
  art: CityArt;
  config: KamiConfig;
  event: EventRecord;
  onScenarioChange: () => void;
  replayToken: number;
  scenario: KamiPreviewScenario;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (replayToken === 0) return;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [replayToken]);

  const toneLabel = KAMI_TONES.find((tone) => tone.id === config.tone)?.label ?? "";
  const contextCount = countActiveContext(event, config);

  return (
    <div className="kami-preview-column" ref={panelRef}>
      <Surface
        aria-labelledby="kami-preview-title"
        as="section"
        className="panel kami-preview"
        depth="raised"
      >
        <div className="panel-heading">
          <div className="section-head">
            <EyeIcon className="section-head__icon" height="19" width="19" />
            <div>
              <h2 className="panel-title" id="kami-preview-title">Example conversation</h2>
              <p className="panel-subtitle">See how Kami will interact with your guests.</p>
            </div>
          </div>
        </div>

        <div className="kami-stage">
          {event.coverImage ? (
            <Image
              alt=""
              aria-hidden="true"
              className="kami-stage__art"
              fill
              sizes="(max-width: 1120px) 100vw, 360px"
              src={event.coverImage}
              unoptimized
            />
          ) : (
            <CityArtwork art={art} className="city-art--photo kami-stage__art" />
          )}
          <span className="kami-stage__scrim" />
          <Surface className="kami-stage__bubble" depth="floating">
            <strong>Hi! I&apos;m Kami</strong>
            <span>Here to help you make meaningful connections during {event.name}.</span>
          </Surface>
        </div>

        <div className="kami-signal">
          <span>{toneLabel} tone</span>
          <span>{activeChannelLabel(config)}</span>
          <span>{contextCount} context {contextCount === 1 ? "source" : "sources"}</span>
        </div>

        <KamiConversation
          config={config}
          key={`${scenario.id}-${replayToken}`}
          onScenarioChange={onScenarioChange}
          scenario={scenario}
        />
      </Surface>

      <TactileButton className="kami-scenario-action" onClick={onScenarioChange}>
        <RefreshIcon height="15" width="15" /> Show another example
      </TactileButton>

      <Surface className="kami-ready" depth="raised">
        <span className="kami-ready__glyph"><OutcomesIcon height="19" width="19" /></span>
        <div>
          <p>Kami uses the configuration above for this event.</p>
        </div>
      </Surface>
    </div>
  );
}
