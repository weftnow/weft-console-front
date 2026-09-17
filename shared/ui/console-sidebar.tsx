import {
  CalendarIcon,
  ChevronDownIcon,
  HomeIcon,
  NetworkIcon,
  OutcomesIcon,
  PeopleIcon,
} from "./icons";
import { Surface } from "./surface";

const navigation = [
  { label: "Overview", icon: HomeIcon, href: "/" },
  { label: "Events", icon: CalendarIcon, href: "/events" },
  { label: "Network", icon: NetworkIcon, href: "#network" },
  { label: "People", icon: PeopleIcon, href: "#people" },
  { label: "Outcomes", icon: OutcomesIcon, href: "#outcomes" },
];

export type ConsoleSection = (typeof navigation)[number]["label"];

export function ConsoleSidebar({ active }: { active: ConsoleSection }) {
  return (
    <Surface as="aside" className="sidebar" depth="raised">
      <div className="brand" aria-label="We Are One">
        <div className="brand-mark"><span /></div>
        <span className="brand-wordmark">WE ARE ONE</span>
      </div>
      <nav aria-label="Primary navigation">
        <ul className="nav-list">
          {navigation.map(({ href, icon: Icon, label }) => {
            const isActive = label === active;

            return (
              <li key={label}>
                <a className={`nav-link ${isActive ? "nav-link--active surface-pressed" : ""}`} href={href} aria-current={isActive ? "page" : undefined}>
                  <Icon height="19" width="19" />
                  <span>{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="brand-story" aria-label="Different cities. A stronger tomorrow.">
        <div className="brand-story__copy">
          <strong>Different Cities.<br />A Stronger Tomorrow.</strong>
          <span className="brand-story__line" />
          <span className="brand-story__label">WE ARE ONE</span>
        </div>
      </div>
      <div className="profile">
        <div className="avatar" aria-hidden="true">N</div>
        <div className="profile__text">
          <span className="profile__name">Nick</span>
          <span className="profile__role">Organizer</span>
        </div>
        <ChevronDownIcon height="15" width="15" />
      </div>
    </Surface>
  );
}
