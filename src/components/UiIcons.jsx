function IconBase({ children, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CompassIcon({ className }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="m10 10 6-2-2 6-6 2 2-6Z" />
    </IconBase>
  );
}

export function ChatIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M7 17.5 3.5 20v-4.5A7.5 7.5 0 1 1 19 15.5H9.5" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </IconBase>
  );
}

export function UserIcon({ className }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8.25" r="3.25" />
      <path d="M5 18.25a7 7 0 0 1 14 0" />
    </IconBase>
  );
}

export function SlidersIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M5 6h14" />
      <path d="M5 18h14" />
      <path d="M8 6a1.5 1.5 0 1 0 0 .01" />
      <path d="M16 18a1.5 1.5 0 1 0 0 .01" />
      <path d="M12 12h7" />
      <path d="M5 12h3" />
      <path d="M10 12a1.5 1.5 0 1 0 0 .01" />
    </IconBase>
  );
}

export function MoonIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M18.5 14.5A6.5 6.5 0 0 1 9.5 5.5a7 7 0 1 0 9 9Z" />
    </IconBase>
  );
}

export function SunIcon({ className }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2.25" />
      <path d="M12 19.25v2.25" />
      <path d="m4.93 4.93 1.59 1.59" />
      <path d="m17.48 17.48 1.59 1.59" />
      <path d="M2.5 12h2.25" />
      <path d="M19.25 12h2.25" />
      <path d="m4.93 19.07 1.59-1.59" />
      <path d="m17.48 6.52 1.59-1.59" />
    </IconBase>
  );
}
