import React from 'react';

// Helper to make code cleaner
const SvgIcon = ({ children, className, onClick }: { children?: React.ReactNode, className?: string, onClick?: (e: any) => void }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    onClick={onClick}
  >
    {children}
  </svg>
);

export const BriefcaseIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></SvgIcon>
);

export const CalendarIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></SvgIcon>
);

export const UserIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></SvgIcon>
);

export const SearchIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></SvgIcon>
);

export const PlusIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="M5 12h14"/><path d="M12 5v14"/></SvgIcon>
);

export const SparklesIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 9v4"/></SvgIcon>
);

export const FilterIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></SvgIcon>
);

export const CheckCircleIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></SvgIcon>
);

export const XIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="M18 6 6 18"/><path d="m6 6 18 12"/></SvgIcon>
);

export const SaveIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></SvgIcon>
);

export const RefreshCwIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></SvgIcon>
);

export const PencilIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></SvgIcon>
);

export const ListIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></SvgIcon>
);

export const LayoutGridIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></SvgIcon>
);

export const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="m15 18-6-6 6-6"/></SvgIcon>
);

export const FileTextIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></SvgIcon>
);

export const PaletteIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></SvgIcon>
);

export const ArrowUpIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="m18 15-6-6-6 6"/></SvgIcon>
);

export const ArrowDownIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}><path d="m6 9 6 6 6-6"/></SvgIcon>
);