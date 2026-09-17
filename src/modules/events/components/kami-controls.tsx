"use client";

import { SparklesIcon } from "@/shared/ui/icons";

/**
 * The Kami identity mark: a ceramic disk cut into the surface it sits on, the
 * same treatment the Overview tab already uses for its Kami card.
 */
export function KamiMark({ size = 56 }: { size?: number }) {
  const glyph = Math.round(size * 0.46);

  return (
    <span className="kami-mark surface-inset" style={{ height: size, width: size }}>
      <SparklesIcon height={glyph} width={glyph} />
    </span>
  );
}

/**
 * A single-choice control: an inset track holding raised ceramic keys. Matches
 * the segmented language already used by the Event Detail tabs and the Create
 * Event attendee tabs.
 */
export function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (next: T) => void;
  options: readonly { id: T; label: string }[];
  value: T;
}) {
  return (
    <div aria-label={label} className="kami-segmented surface-inset" role="group">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            aria-pressed={selected}
            className="kami-segment"
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <span className="kami-segment__dot" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Inset track, raised knob. Disabled while a channel has no integration. */
export function ToggleSwitch({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="kami-switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="kami-switch__knob" />
    </button>
  );
}
