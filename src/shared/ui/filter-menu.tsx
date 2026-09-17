import type { ReactNode } from "react";

import { ChevronDownIcon } from "./icons";
import { Surface } from "./surface";

interface FilterMenuProps {
  icon?: ReactNode;
  label: string;
  options: string[];
}

export function FilterMenu({ icon, label, options }: FilterMenuProps) {
  return (
    <details className="filter-menu">
      <summary className="tactile-button filter-trigger">
        {icon}
        <span>{label}</span>
        <ChevronDownIcon height="15" width="15" />
      </summary>
      <Surface className="filter-options" depth="floating">
        {options.map((option) => <button key={option} type="button">{option}</button>)}
      </Surface>
    </details>
  );
}
