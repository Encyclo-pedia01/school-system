"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  CalendarCheck,
  GraduationCap,
  Home,
  LoaderCircle,
  LogOut,
  Menu,
  Settings,
  UserSquare,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { selectInstitution } from "@/app/actions/settings";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { InstitutionContext } from "@/lib/institution/context";

const navigation = [
  { label: "Overview", href: "/", icon: Home },
  { label: "Students", href: "/students", icon: Users },
  { label: "Staff", href: "/staff", icon: UserSquare },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
  { label: "Results", href: "/results", icon: GraduationCap },
  { label: "Settings", href: "/settings", icon: Settings },
];

function roleLabel(role: string) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DashboardShell({
  children,
  context,
}: {
  children: React.ReactNode;
  context: InstitutionContext | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const pageTitle = navigation.find((item) => item.href === pathname)?.label ?? "School Manager";

  useEffect(() => {
    if (!menuOpen) return;

    const panel = panelRef.current;
    const menuButton = menuButtonRef.current;
    const focusableItems = () => Array.from(
      panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
    );
    focusableItems()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusableItems();
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [menuOpen]);

  const signOut = () => {
    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
          toast.error("Sign-out failed. Try again.");
          return;
        }
        router.replace("/login");
        router.refresh();
      } catch {
        toast.error("Sign-out is temporarily unavailable.");
      }
    });
  };

  const changeInstitution = (institutionId: string) => {
    startTransition(async () => {
      const result = await selectInstitution({ institutionId });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  };

  const renderLinks = () => navigation.map(({ label, href, icon: Icon }) => (
    <Link
      key={href}
      href={href}
      onClick={() => setMenuOpen(false)}
      aria-current={pathname === href ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        pathname === href
          ? "bg-blue-50 text-blue-800"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      <span>{label}</span>
    </Link>
  ));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight text-blue-900">
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-md bg-blue-800 text-sm text-white">S</span>
            <span>School Manager</span>
          </Link>
          <p className="mt-1 pl-10 text-xs text-slate-500">Operations workspace</p>
        </div>
        <nav aria-label="Main navigation" className="flex-1 space-y-1 p-4">
          {renderLinks()}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <button type="button" onClick={signOut} disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            {pending ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-slate-950/40" />
          <aside ref={panelRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title" className="relative flex h-full w-[min(20rem,85vw)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 id="mobile-navigation-title" className="font-semibold text-blue-900">School Manager</h2>
              <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Main navigation" className="flex-1 space-y-1 p-4">{renderLinks()}</nav>
            <div className="border-t border-slate-200 p-4">
              <button type="button" onClick={signOut} disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-60">
                {pending ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button ref={menuButtonRef} type="button" aria-label="Open navigation menu" aria-expanded={menuOpen} aria-controls={menuOpen ? "mobile-navigation" : undefined} onClick={() => setMenuOpen(true)} className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden">
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{pageTitle}</p>
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {context?.institutionName?.trim() || "School Manager"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {context && context.memberships.length > 1 ? (
              <label className="sr-only" htmlFor="institution-select">Institution</label>
            ) : null}
            {context && context.memberships.length > 1 ? (
              <select
                id="institution-select"
                aria-label="Active institution"
                value={context.institutionId}
                disabled={pending}
                onChange={(event) => changeInstitution(event.target.value)}
                className="max-w-40 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 sm:max-w-64 sm:text-sm"
              >
                {context.memberships.map((membership) => (
                  <option key={membership.institutionId} value={membership.institutionId}>{membership.institutionName}</option>
                ))}
              </select>
            ) : null}
            <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 sm:inline-flex">
              {context ? roleLabel(context.role) : "No institution"}
            </span>
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-5 text-sm text-slate-600 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>School Manager · School operations, kept clear.</p>
            <nav aria-label="Legal and support" className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href="/privacy" className="hover:text-blue-800">Privacy</Link>
              <Link href="/terms" className="hover:text-blue-800">Terms</Link>
              <a href="mailto:joegady94@gmail.com" className="hover:text-blue-800">joegady94@gmail.com</a>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
