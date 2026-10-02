import Link from "next/link";

import {
  CalendarIcon,
  HomeIcon,
  NetworkIcon,
  OutcomesIcon,
  PeopleIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { ConsoleAccount } from "@/shared/ui/console-account";
import type { ConsoleContext } from "@/modules/organizations/types";

export type ConsoleDestination = "overview" | "events" | "network" | "people";

type NavigationItem = {
  key: ConsoleDestination | "outcomes";
  label: string;
  href: string;
  icon: typeof HomeIcon;
  supported: boolean;
};

const navigation: NavigationItem[] = [
  { key: "overview", label: "Overview", href: "/", icon: HomeIcon, supported: true },
  { key: "events", label: "Events", href: "/events", icon: CalendarIcon, supported: true },
  { key: "network", label: "Network", href: "/network", icon: NetworkIcon, supported: true },
  { key: "people", label: "People", href: "/people", icon: PeopleIcon, supported: true },
  { key: "outcomes", label: "Outcomes", href: "", icon: OutcomesIcon, supported: false },
];

export function ConsoleSidebar({ active, context }: { active: ConsoleDestination; context: ConsoleContext }) {
  return (
    <Surface as="aside" className="sidebar" depth="raised">
      <div className="brand" aria-label="Weft">
        <div className="brand-mark"><span /></div>
        <span className="brand-wordmark">Weft</span>
      </div>
      <nav aria-label="Primary navigation">
        <ul className="nav-list">
          {navigation.map(({ href, icon: Icon, key, label, supported }) => {
            const isActive = key === active;
            const className = `nav-link ${isActive ? "nav-link--active surface-pressed" : ""}`;
            const content = <><Icon height="19" width="19" /><span>{label}</span></>;
            return (
              <li key={key}>
                {supported ? (
                  <Link className={className} href={href} aria-current={isActive ? "page" : undefined}>{content}</Link>
                ) : (
                  <span className={`${className} nav-link--disabled`} aria-disabled="true">{content}</span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="brand-story" aria-label="The networking layer for business events.">
        <div className="brand-story__copy">
          <strong>The networking layer<br />for business events.</strong>
          <span className="brand-story__line" />
          <span className="brand-story__label">Weft</span>
        </div>
      </div>
      <ConsoleAccount user={context.user} organization={{ name: context.organization.name, role: context.membership.role }} />
    </Surface>
  );
}
