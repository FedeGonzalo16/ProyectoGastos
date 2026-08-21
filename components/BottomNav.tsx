"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: (props: { color: string }) => React.ReactElement;
}

// Mismos 4 destinos e íconos que se definieron en los mockups (design/).
const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    icon: ({ color }) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <path d="M4 11 12 4l8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M6 10v8.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V10"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/gastos",
    label: "Gastos",
    icon: ({ color }) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="6.5" width="17" height="12" rx="2.2" stroke={color} strokeWidth="1.7" />
        <path d="M13.5 12.5h4M17.5 12.5v0" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/mensual",
    label: "Mensual",
    icon: ({ color }) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke={color} strokeWidth="1.7" />
        <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/inversiones",
    label: "Inversión",
    icon: ({ color }) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <path d="M4 17l5-5.5 4 3.5L20 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 6h5v5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/** Barra de navegación inferior, compartida por todas las pantallas protegidas. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 mx-auto flex w-full max-w-97.5 justify-around border-t px-3 py-3"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const color = isActive ? "var(--color-brand)" : "var(--color-muted)";

        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1">
            {item.icon({ color })}
            <span className="text-[10px]" style={{ color, fontWeight: isActive ? 600 : 400 }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
