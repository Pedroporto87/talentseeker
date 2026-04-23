"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const item of NAV_ITEMS) {
      if (item.href !== pathname) {
        router.prefetch(item.href);
      }
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_transparent_30%),linear-gradient(135deg,#f2eadf_0%,#d8e5df_42%,#9ac4b7_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="rounded-[32px] border border-white/60 bg-[#163f35] px-6 py-5 text-white shadow-[0_20px_60px_rgba(12,37,31,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                Plataforma de recrutamento inteligente
              </p>
              <div>
                <h1 className="font-serif text-3xl tracking-tight lg:text-4xl">
                  {APP_NAME}
                </h1>
                <p className="max-w-2xl text-sm text-white/75 lg:text-base">
                  Centralize vagas, analise curriculos, priorize candidatos e
                  acompanhe o funil seletivo com apoio de IA.
                </p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition hover:bg-white/10",
                    pathname === item.href
                      ? "bg-[#f08a24] text-[#1b271f]"
                      : "bg-white/5 text-white/80",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
