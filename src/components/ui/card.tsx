import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(22,44,36,0.12)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}
