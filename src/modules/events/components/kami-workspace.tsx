"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import type { CityArt } from "@/shared/ui/city-artwork";
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  DatabaseIcon,
  GlobeIcon,
  MessageIcon,
  MicIcon,
  PhoneIcon,
  PlayIcon,
  PlusIcon,
  ShareNodesIcon,
  SlidersIcon,
  UserIcon,
  WhatsAppIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import type { EventRecord } from "../event-record";
import {
  clearKamiConfig,
  deriveKamiDefaults,
  isContextEnabled,
  isDefaultKamiConfig,
  KAMI_ACTIVATIONS,
  KAMI_CHANNELS,
  KAMI_CONTEXT_LIMIT,
  KAMI_FALLBACK_LIMIT,
  KAMI_INSTRUCTIONS_LIMIT,
  KAMI_TONES,
  KAMI_WELCOME_LIMIT,
  type KamiChannel,
  type KamiConfig,
  loadKamiConfig,
  MAX_CUSTOM_CONTEXT,
  saveKamiConfig,
} from "../kami-config";
import { deriveKamiContext, KAMI_PREVIEW_SCENARIOS } from "../kami-preview";
import { useDictation } from "../hooks/use-dictation";
import { KamiCallModal } from "./kami-call-modal";
import { KamiMark, SegmentedControl, ToggleSwitch } from "./kami-controls";
import { KamiPreviewPanel } from "./kami-preview-panel";

const CHANNEL_ICONS: Record<KamiChannel, typeof GlobeIcon> = {
  calls: PhoneIcon,
  sms: MessageIcon,
  web: GlobeIcon,
  whatsapp: WhatsAppIcon,
};

function KamiSection({
  children,
  description,
  icon,
  id,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <Surface aria-labelledby={id} as="section" className="panel kami-section" depth="raised">
      <div className="panel-heading">
        <div className="section-head">
          <span className="section-head__icon">{icon}</span>
          <div>
            <h2 className="panel-title" id={id}>{title}</h2>
            <p className="panel-subtitle">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </Surface>
  );
}

function CountedField({
  compact = false,
  id,
  label,
  limit,
  onChange,
  rows,
  value,
}: {
  compact?: boolean;
  id: string;
  label: string;
  limit: number;
  onChange: (next: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <div className={`event-field kami-field ${compact ? "kami-field--compact" : ""}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <div className="textarea-wrap">
        <textarea
          className="event-control event-textarea"
          id={id}
          maxLength={limit}
          onChange={(input) => onChange(input.target.value)}
          rows={rows}
          value={value}
        />
        <span>{value.length}/{limit}</span>
      </div>
    </div>
  );
}

function ContextCheck({ available, enabled }: { available: boolean; enabled: boolean }) {
  return (
    <span className="kami-context__check">
      {!available ? null : enabled ? <CheckIcon height="13" width="13" /> : null}
    </span>
  );
}

/**
 * Free-text context in the organizer's own words, typed or dictated. Dictation
 * uses the browser's own speech recognition; nothing is sent to Weft.
 */
function ContextComposer({
  onAdd,
  onClose,
}: {
  onAdd: (text: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const dictation = useDictation((transcript) => {
    setDraft((current) => (current ? `${current.trim()} ${transcript}` : transcript).slice(0, KAMI_CONTEXT_LIMIT));
  });

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    dictation.stop();
    onAdd(text);
    onClose();
  };

  return (
    <div className="kami-context-composer surface-inset">
      <label className="kami-field__label" htmlFor="kami-context-input">
        Tell Kami something else about this event
      </label>
      <div className="textarea-wrap">
        <textarea
          autoFocus
          className="event-control event-textarea"
          id="kami-context-input"
          maxLength={KAMI_CONTEXT_LIMIT}
          onChange={(input) => setDraft(input.target.value)}
          placeholder="The founders table is seated near the terrace, and our sponsors want to meet media first."
          rows={2}
          value={draft}
        />
        <span>{draft.length}/{KAMI_CONTEXT_LIMIT}</span>
      </div>
      <div className="kami-context-composer__actions">
        <button
          aria-pressed={dictation.listening}
          className="kami-mic"
          disabled={!dictation.supported}
          onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
          title={dictation.supported ? undefined : "This browser has no speech recognition."}
          type="button"
        >
          <MicIcon height="15" width="15" />
          {dictation.listening ? "Listening…" : "Dictate"}
        </button>
        <div className="kami-context-composer__confirm">
          <TactileButton
            onClick={() => {
              dictation.stop();
              onClose();
            }}
          >
            Cancel
          </TactileButton>
          <TactileButton disabled={draft.trim() === ""} onClick={submit} variant="primary">
            Add context
          </TactileButton>
        </div>
      </div>
      {dictation.error ? <p className="kami-context-composer__error">{dictation.error}</p> : null}
    </div>
  );
}

export function KamiWorkspace({
  art,
  event,
  onNotice,
}: {
  art: CityArt;
  event: EventRecord;
  onNotice: (message: string) => void;
}) {
  const defaults = useMemo(() => deriveKamiDefaults(event), [event]);
  const [config, setConfig] = useState<KamiConfig>(() => loadKamiConfig(event));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [replayToken, setReplayToken] = useState(0);
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    saveKamiConfig(event.id, config);
  }, [config, event.id]);

  const context = useMemo(() => deriveKamiContext(event), [event]);
  const usingDefaults = isDefaultKamiConfig(config, defaults);
  const scenario = KAMI_PREVIEW_SCENARIOS[scenarioIndex];

  const update = <K extends keyof KamiConfig>(key: K, value: KamiConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const setChannel = (channel: KamiChannel, enabled: boolean) => {
    setConfig((current) => ({
      ...current,
      channels: { ...current.channels, [channel]: enabled },
    }));
  };

  const toggleContext = (id: string, enabled: boolean) => {
    setConfig((current) => ({ ...current, context: { ...current.context, [id]: enabled } }));
  };

  const toggleCustomContext = (id: string, enabled: boolean) => {
    setConfig((current) => ({
      ...current,
      customContext: current.customContext.map((item) =>
        item.id === id ? { ...item, enabled } : item,
      ),
    }));
  };

  const removeCustomContext = (id: string) => {
    setConfig((current) => ({
      ...current,
      customContext: current.customContext.filter((item) => item.id !== id),
    }));
  };

  const addCustomContext = (text: string) => {
    setConfig((current) => ({
      ...current,
      customContext: [
        ...current.customContext,
        { enabled: true, id: `context-${Date.now().toString(36)}`, text },
      ].slice(0, MAX_CUSTOM_CONTEXT),
    }));
  };

  const resetToDefault = () => {
    setConfig(defaults);
    clearKamiConfig(event.id);
    setAdvancedOpen(false);
    setComposerOpen(false);
    setCallModalOpen(false);
    setResetToken((token) => token + 1);
    setReplayToken((token) => token + 1);
    onNotice("Kami is back on its default configuration.");
  };

  const previewExperience = () => {
    setReplayToken((token) => token + 1);
    setCallModalOpen(true);
  };

  const nextScenario = () => {
    setScenarioIndex((index) => (index + 1) % KAMI_PREVIEW_SCENARIOS.length);
  };

  return (
    <div className="kami-layout">
      <div className="kami-config-column" key={resetToken}>
        <Surface aria-labelledby="kami-status-title" as="section" className="panel kami-status" depth="raised">
          <div className="kami-status__identity">
            <KamiMark size={62} />
            <div>
              <h2 id="kami-status-title">Kami</h2>
              <p>Your AI co-host for meaningful connections</p>
            </div>
          </div>
          <div className="kami-status__side">
            <div className="kami-status__state">
              <span className="kami-status__pill">Ready</span>
              <small>{usingDefaults ? "Using default configuration" : "Customized for this event"}</small>
            </div>
            <div className="kami-status__actions">
              <TactileButton className="kami-status__action" onClick={previewExperience} variant="graphite">
                <PlayIcon height="15" width="15" /> Preview experience
              </TactileButton>
              <TactileButton className="kami-status__action" disabled={usingDefaults} onClick={resetToDefault}>
                Reset to default
              </TactileButton>
            </div>
          </div>
          <p className="kami-status__copy">
            Kami will be active during {event.name} and use the event and attendee context below to
            help guests find the right people, make introductions, and get the most value from their
            time in the room.
          </p>
        </Surface>

        <KamiSection
          description="Define how Kami communicates and represents this event."
          icon={<UserIcon height="19" width="19" />}
          id="kami-experience-title"
          title="Experience"
        >
          <CountedField
            compact
            id="kami-welcome"
            label="Welcome message"
            limit={KAMI_WELCOME_LIMIT}
            onChange={(value) => update("welcomeMessage", value)}
            rows={2}
            value={config.welcomeMessage}
          />

          <div className="kami-field">
            <span className="kami-field__label">Tone</span>
            <SegmentedControl
              label="Tone"
              onChange={(tone) => update("tone", tone)}
              options={KAMI_TONES}
              value={config.tone}
            />
          </div>

          <CountedField
            id="kami-instructions"
            label="Event specific instructions"
            limit={KAMI_INSTRUCTIONS_LIMIT}
            onChange={(value) => update("instructions", value)}
            rows={4}
            value={config.instructions}
          />
        </KamiSection>

        <KamiSection
          description="Where Kami can interact with attendees during this event."
          icon={<ShareNodesIcon height="19" width="19" />}
          id="kami-channels-title"
          title="Channels"
        >
          <div className="kami-channels">
            {KAMI_CHANNELS.map((channel) => {
              const ChannelIcon = CHANNEL_ICONS[channel.id];
              const enabled = config.channels[channel.id];
              return (
                <Surface
                  className="kami-channel"
                  data-enabled={enabled}
                  depth="floating"
                  key={channel.id}
                >
                  <span className="kami-channel__icon"><ChannelIcon height="18" width="18" /></span>
                  <div>
                    <strong>{channel.label}</strong>
                    <span>
                      {!channel.available ? "Coming soon" : enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={enabled}
                    disabled={!channel.available}
                    label={`${channel.label} channel`}
                    onChange={(next) => setChannel(channel.id, next)}
                  />
                </Surface>
              );
            })}
          </div>
        </KamiSection>

        <KamiSection
          description="Choose what Kami can draw on to understand the room, and add anything else in your own words."
          icon={<DatabaseIcon height="19" width="19" />}
          id="kami-context-title"
          title="Context Kami can use"
        >
          <ul className="kami-context">
            {context.map((item) => {
              const enabled = item.available && isContextEnabled(config, item.id);
              return (
                <li className="kami-context__item" data-enabled={enabled} key={item.id}>
                  <button
                    aria-pressed={enabled}
                    className="kami-context__toggle"
                    disabled={!item.available}
                    onClick={() => toggleContext(item.id, !enabled)}
                    type="button"
                  >
                    <ContextCheck available={item.available} enabled={enabled} />
                    <strong>{item.label}</strong>
                    <span className="kami-context__detail">
                      {item.available && !enabled ? "Not used by Kami" : item.detail}
                    </span>
                  </button>
                </li>
              );
            })}

            {config.customContext.map((item) => (
              <li
                className="kami-context__item kami-context__item--custom"
                data-enabled={item.enabled}
                key={item.id}
              >
                <button
                  aria-pressed={item.enabled}
                  className="kami-context__toggle"
                  onClick={() => toggleCustomContext(item.id, !item.enabled)}
                  type="button"
                >
                  <ContextCheck available enabled={item.enabled} />
                  <strong>{item.text}</strong>
                  <span className="kami-context__detail">
                    {item.enabled ? "Added by you" : "Not used by Kami"}
                  </span>
                </button>
                <button
                  aria-label={`Remove context: ${item.text}`}
                  className="kami-context__remove"
                  onClick={() => removeCustomContext(item.id)}
                  type="button"
                >
                  <CloseIcon height="13" width="13" />
                </button>
              </li>
            ))}

            {config.customContext.length < MAX_CUSTOM_CONTEXT ? (
              <li className="kami-context__item kami-context__item--add">
                <button
                  className="kami-context__toggle kami-context__add"
                  onClick={() => setComposerOpen(true)}
                  type="button"
                >
                  <span className="kami-context__check kami-context__check--add">
                    <PlusIcon height="13" width="13" />
                  </span>
                  <strong>Add context</strong>
                  <span className="kami-context__detail">Type it or dictate it</span>
                </button>
              </li>
            ) : null}
          </ul>

          {composerOpen ? (
            <ContextComposer
              onAdd={addCustomContext}
              onClose={() => setComposerOpen(false)}
            />
          ) : null}
        </KamiSection>

        <Surface aria-labelledby="kami-advanced-title" as="section" className="panel kami-section kami-advanced" depth="raised">
          <button
            aria-controls="kami-advanced-region"
            aria-expanded={advancedOpen}
            className="kami-advanced__trigger"
            onClick={() => setAdvancedOpen((open) => !open)}
            type="button"
          >
            <span className="section-head">
              <span className="section-head__icon"><SlidersIcon height="19" width="19" /></span>
              <span>
                <strong className="panel-title" id="kami-advanced-title">Advanced settings</strong>
                <span className="panel-subtitle">Additional configuration options (optional)</span>
              </span>
            </span>
            <ChevronDownIcon height="17" width="17" />
          </button>
          <div className="kami-advanced__region" data-open={advancedOpen} id="kami-advanced-region">
            <div className="kami-advanced__clip">
              <div className="kami-advanced__inner surface-inset">
                <div className="event-field">
                  <label htmlFor="kami-activation">Kami activation timing</label>
                  <select
                    className="event-control"
                    id="kami-activation"
                    onChange={(input) =>
                      update("activation", input.target.value as KamiConfig["activation"])
                    }
                    value={config.activation}
                  >
                    {KAMI_ACTIVATIONS.map((activation) => (
                      <option key={activation.id} value={activation.id}>{activation.label}</option>
                    ))}
                  </select>
                </div>
                <CountedField
                  compact
                  id="kami-fallback"
                  label="Fallback message"
                  limit={KAMI_FALLBACK_LIMIT}
                  onChange={(value) => update("fallbackMessage", value)}
                  rows={2}
                  value={config.fallbackMessage}
                />
                <div className="kami-advanced__reset">
                  <div>
                    <strong>Reset configuration</strong>
                    <span>Return every Kami setting on this event to its default.</span>
                  </div>
                  <TactileButton disabled={usingDefaults} onClick={resetToDefault}>
                    Reset configuration
                  </TactileButton>
                </div>
              </div>
            </div>
          </div>
        </Surface>
      </div>

      <KamiPreviewPanel
        art={art}
        config={config}
        event={event}
        onScenarioChange={nextScenario}
        replayToken={replayToken}
        scenario={scenario}
      />

      <KamiCallModal
        config={config}
        event={event}
        onClose={() => setCallModalOpen(false)}
        open={callModalOpen}
      />
    </div>
  );
}
