import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {children}
      </g>
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return <IconBase {...props}><path d="m3 10 9-7 9 7" /><path d="M5 9v11h5v-6h4v6h5V9" /></IconBase>;
}
export function CalendarIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01" /></IconBase>;
}
export function NetworkIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="6" cy="17" r="2.3" /><circle cx="18" cy="7" r="2.3" /><circle cx="18" cy="18" r="2.3" /><path d="m8 16 7.8-7M8.3 17.2l7.3.6" /></IconBase>;
}
export function PeopleIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-2.2c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3V20" /><path d="M15 6.2a2.7 2.7 0 0 1 0 5.2M16.5 13.3c2.4.4 4 2.1 4 4.5V20" /></IconBase>;
}
export function OutcomesIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 20h16M6 20v-6h4v6M10 20V9h4v11M14 20V4h4v16" /></IconBase>;
}
export function LocationIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></IconBase>;
}
export function ChevronDownIcon(props: IconProps) {
  return <IconBase {...props}><path d="m7 10 5 5 5-5" /></IconBase>;
}
export function ChevronRightIcon(props: IconProps) {
  return <IconBase {...props}><path d="m10 7 5 5-5 5" /></IconBase>;
}
export function ArrowRightIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 12h14M14 7l5 5-5 5" /></IconBase>;
}
export function TrendIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 19V5M7 10l5-5 5 5" /></IconBase>;
}
export function LinkIcon(props: IconProps) {
  return <IconBase {...props}><path d="m10 13 4-4" /><path d="m7.5 15.5-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0" transform="translate(3 0)" /><path d="m14.5 8.5 1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" transform="translate(-3 0)" /></IconBase>;
}
export function GlobeIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9s-1.2 6.5-3.5 9c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z" /></IconBase>;
}
export function StarIcon(props: IconProps) {
  return <IconBase {...props}><path d="m12 3 2.2 5.9 6.3.3-4.9 4 1.7 6.1-5.3-3.5-5.3 3.5 1.7-6.1-4.9-4 6.3-.3L12 3Z" /></IconBase>;
}
export function ClockIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></IconBase>;
}
export function ShieldIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></IconBase>;
}
export function SearchIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></IconBase>;
}
export function PlusIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 5v14M5 12h14" /></IconBase>;
}
export function StaffIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="10" cy="8" r="3.2" /><path d="M4 20v-2c0-2.7 2.7-4.6 6-4.6 1.2 0 2.3.2 3.2.7" /><path d="m15.5 18 1.8 1.8 3.2-4" /></IconBase>;
}
export function SortIcon(props: IconProps) {
  return <IconBase {...props}><path d="M8 4.5v15M4.8 16.3 8 19.5l3.2-3.2" /><path d="M16 19.5v-15M12.8 7.7 16 4.5l3.2 3.2" /></IconBase>;
}
export function ArrowLeftIcon(props: IconProps) {
  return <IconBase {...props}><path d="M19 12H5M10 7l-5 5 5 5" /></IconBase>;
}
export function SparklesIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 2.5c.4 4.1 2.6 6.3 6.7 6.7-4.1.4-6.3 2.6-6.7 6.7-.4-4.1-2.6-6.3-6.7-6.7 4.1-.4 6.3-2.6 6.7-6.7Z" /><path d="M19 15.5c.2 2 1.3 3.1 3.3 3.3-2 .2-3.1 1.3-3.3 3.3-.2-2-1.3-3.1-3.3-3.3 2-.2 3.1-1.3 3.3-3.3ZM5.3 2.5c.1 1.4.9 2.2 2.3 2.3-1.4.1-2.2.9-2.3 2.3-.1-1.4-.9-2.2-2.3-2.3 1.4-.1 2.2-.9 2.3-2.3Z" /></IconBase>;
}
export function CloseIcon(props: IconProps) {
  return <IconBase {...props}><path d="m7 7 10 10M17 7 7 17" /></IconBase>;
}
export function ReturnIcon(props: IconProps) {
  return <IconBase {...props}><path d="M8 7H4V3" /><path d="M4.5 7.5A8.5 8.5 0 1 1 3.8 16" /></IconBase>;
}
