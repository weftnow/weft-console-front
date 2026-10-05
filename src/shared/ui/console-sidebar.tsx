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
import { teamInvitationsEnabled } from "@/modules/organizations/invitations/availability";

export type ConsoleDestination = "overview" | "events" | "network" | "people" | "team";

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
  { key: "team", label: "Team", href: "/settings/team", icon: PeopleIcon, supported: true },
  { key: "outcomes", label: "Outcomes", href: "", icon: OutcomesIcon, supported: false },
];

export function ConsoleSidebar({ active, context }: { active: ConsoleDestination; context: ConsoleContext }) {
  return (
    <Surface as="aside" className="sidebar" depth="raised">
      <div className="brand" aria-label={context.organization.name}>
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <span className="brand-wordmark">{context.organization.name}</span>
      </div>
      <nav aria-label="Primary navigation">
        <ul className="nav-list">
          {navigation.filter((item) => item.key !== "team" || (context.membership.role === "owner" && teamInvitationsEnabled())).map(({ href, icon: Icon, key, label, supported }) => {
            const isActive = key === active;
            const className = `nav-link ${isActive ? "nav-link--active surface-pressed" : ""}`;
            const content = <><Icon height="19" width="19" /><span>{label}</span></>;
            return (
              <li key={key}>
                {supported ? (
                  <Link className={className} href={href} aria-label={label} aria-current={isActive ? "page" : undefined}>{content}</Link>
                ) : (
                  <span className={`${className} nav-link--disabled`} aria-label={label} aria-disabled="true">{content}</span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <ConsoleAccount user={context.user} organization={{ name: context.organization.name, role: context.membership.role }} />
    </Surface>
  );
}
