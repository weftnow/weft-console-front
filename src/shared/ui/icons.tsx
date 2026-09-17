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
export function UploadIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></IconBase>;
}
export function DocumentIcon(props: IconProps) {
  return <IconBase {...props}><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></IconBase>;
}
export function CheckIcon(props: IconProps) {
  return <IconBase {...props}><path d="m5 12 4 4L19 6" /></IconBase>;
}
export function TrashIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></IconBase>;
}
export function ImageIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m5 18 5-5 3 3 2-2 4 4" /></IconBase>;
}
export function EditIcon(props: IconProps) {
  return <IconBase {...props}><path d="M13.5 6.5 17.5 10.5M4 20l4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L4 20Z" /><path d="m13 6 4 4" /></IconBase>;
}
export function BriefcaseIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="7.5" width="18" height="13" rx="2.6" /><path d="M8.7 7.5V5.9A2.4 2.4 0 0 1 11.1 3.5h1.8a2.4 2.4 0 0 1 2.4 2.4v1.6" /><path d="M3 12.6h18M10.4 12.6v2.1h3.2v-2.1" /></IconBase>;
}
export function TargetIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r=".6" fill="currentColor" /></IconBase>;
}
export function ClipboardIcon(props: IconProps) {
  return <IconBase {...props}><rect x="4.5" y="4.5" width="15" height="16" rx="2.6" /><path d="M9 4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5v1.2H9V4.5Z" /><path d="M8.5 11.5h7M8.5 15.5h4.5" /></IconBase>;
}
export function SendIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20.5 3.5 10.8 13.2" /><path d="M20.5 3.5 14.3 20.5l-3.5-7.3-7.3-3.5 17-6.2Z" /></IconBase>;
}
export function ExternalLinkIcon(props: IconProps) {
  return <IconBase {...props}><path d="M13.5 4.5H19.5V10.5" /><path d="m19.5 4.5-8 8" /><path d="M18 14.5v3.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" /></IconBase>;
}
export function NoteIcon(props: IconProps) {
  return <IconBase {...props}><path d="M6 3.5h7.5L19 9v11.5a0 0 0 0 1 0 0H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" /><path d="M13.5 3.5V9H19" /><path d="M8.5 13.5h7M8.5 16.5h4.5" /></IconBase>;
}
export function FilterIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3.5 5.5h17l-6.6 7.7v5.5l-3.8 2v-7.5L3.5 5.5Z" /></IconBase>;
}
export function DownloadIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 4v10.5M8 11l4 4 4-4" /><path d="M5 16.5v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /></IconBase>;
}
export function PieIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3a9 9 0 1 0 9 9h-9V3Z" /><path d="M15.5 3.9A9 9 0 0 1 20.1 8.5" /></IconBase>;
}
export function IdeaIcon(props: IconProps) {
  return <IconBase {...props}><path d="M9 17.5a5.5 5.5 0 1 1 6 0v1.2a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 18.7v-1.2Z" /><path d="M9.5 17.5h5" /></IconBase>;
}
export function MessageIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20.5 12.4c0 4-3.8 7.2-8.5 7.2a9.8 9.8 0 0 1-2.6-.35L4.5 20.5l1.3-3.5a6.9 6.9 0 0 1-2.3-5c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" /></IconBase>;
}
export function WhatsAppIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20.5 11.8c0 4.4-3.8 8-8.5 8a9 9 0 0 1-4-.9l-4.5 1.4 1.5-4.1a7.7 7.7 0 0 1-1.5-4.4c0-4.4 3.8-8 8.5-8s8.5 3.6 8.5 8Z" /><path d="M9.3 9c.3-.1.6 0 .8.3l.7 1.2c.1.3.1.6-.1.8l-.4.5c-.1.2-.2.4 0 .7.4.7 1.1 1.3 1.9 1.7.3.1.5.1.7-.1l.5-.5c.2-.2.5-.3.8-.2l1.2.6c.3.2.4.5.3.8a2 2 0 0 1-2.4 1.3 7 7 0 0 1-4.7-4.4A2 2 0 0 1 9.3 9Z" /></IconBase>;
}
export function ShareNodesIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="18" cy="5.8" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="18.2" r="2.6" /><path d="m8.4 10.8 7.3-3.6M8.4 13.2l7.3 3.6" /></IconBase>;
}
export function DatabaseIcon(props: IconProps) {
  return <IconBase {...props}><ellipse cx="12" cy="6.5" rx="7.5" ry="3" /><path d="M4.5 6.5v11c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-11" /><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" /></IconBase>;
}
export function EyeIcon(props: IconProps) {
  return <IconBase {...props}><path d="M2.8 12S6.5 5.8 12 5.8 21.2 12 21.2 12 17.5 18.2 12 18.2 2.8 12 2.8 12Z" /><circle cx="12" cy="12" r="3" /></IconBase>;
}
export function PlayIcon(props: IconProps) {
  return <IconBase {...props}><path d="M8.5 5.6 18 12l-9.5 6.4V5.6Z" /></IconBase>;
}
export function RefreshIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6" /><path d="M4 18.5V13h5.5M20 5.5V11h-5.5" /></IconBase>;
}
export function SlidersIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7.5h4M13 7.5h7M4 16.5h7M16 16.5h4" /><circle cx="10.5" cy="7.5" r="2.2" /><circle cx="13.5" cy="16.5" r="2.2" /></IconBase>;
}
export function UserIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="8" r="3.4" /><path d="M5 20v-1.4c0-2.9 3.1-5 7-5s7 2.1 7 5V20" /></IconBase>;
}
export function PhoneIcon(props: IconProps) {
  return <IconBase {...props}><path d="M8.2 4.5H5.6A2.1 2.1 0 0 0 3.5 6.8c.3 3.5 1.9 6.8 4.4 9.3s5.8 4.1 9.3 4.4a2.1 2.1 0 0 0 2.3-2.1v-2.6l-3.6-1.2-1.7 1.7a13.4 13.4 0 0 1-5.3-5.3l1.7-1.7L8.2 4.5Z" /></IconBase>;
}
export function MicIcon(props: IconProps) {
  return <IconBase {...props}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></IconBase>;
}
