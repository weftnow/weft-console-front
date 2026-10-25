"use client";

import Link from "next/link";

import {
  CalendarIcon,
  HomeIcon,
  NetworkIcon,
  OutcomesIcon,
  PeopleIcon,
} from "@/shared/ui/icons";
import type { Dictionary } from "@/shared/i18n/dictionaries";
import { Surface } from "@/shared/ui/surface";
import { ConsoleAccount } from "@/shared/ui/console-account";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { ConsoleContext } from "@/modules/organizations/types";

export type ConsoleDestination = "overview" | "events" | "network" | "people" | "team";

type NavigationItem = {
  key: ConsoleDestination | "outcomes";
  label: keyof Dictionary["nav"];
  href: string;
  icon: typeof HomeIcon;
  supported: boolean;
};

const navigation: NavigationItem[] = [
  { key: "overview", label: "overview", href: "/", icon: HomeIcon, supported: true },
  { key: "events", label: "events", href: "/events", icon: CalendarIcon, supported: true },
  { key: "network", label: "network", href: "/network", icon: NetworkIcon, supported: true },
  { key: "people", label: "people", href: "/people", icon: PeopleIcon, supported: true },
  { key: "team", label: "team", href: "/settings/team", icon: PeopleIcon, supported: true },
  { key: "outcomes", label: "outcomes", href: "", icon: OutcomesIcon, supported: false },
];

export function ConsoleSidebar({ active, context }: { active: ConsoleDestination; context: ConsoleContext }) {
  const { dict } = useI18n();
  return (
    <Surface as="aside" className="sidebar" depth="raised">
      <div className="brand" aria-label={context.organization.name}>
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <span className="brand-wordmark">{context.organization.name}</span>
      </div>
      <nav aria-label={dict.nav.primary}>
        <ul className="nav-list">
          {navigation.filter((item) => item.key !== "team" || context.membership.role === "owner").map(({ href, icon: Icon, key, label: labelKey, supported }) => {
            const label = dict.nav[labelKey];
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
