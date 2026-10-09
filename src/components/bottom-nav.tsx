"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CameraIcon, DumbbellIcon, HomeIcon, SettingsIcon } from "./icons";

const TABS = [
  { href: "/", label: "Today", Icon: HomeIcon },
  { href: "/meals/new", label: "Log meal", Icon: CameraIcon },
  { href: "/workouts", label: "Workouts", Icon: DumbbellIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon width={22} height={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
