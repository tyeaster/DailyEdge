import type { ReactNode } from "react";

import { Card } from "./card";

export type ModalProps = {
  children: ReactNode;
  description?: string;
  open?: boolean;
  title: string;
};

export function Modal({ children, description, open = false, title }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 px-6 backdrop-blur">
      <Card className="w-full max-w-lg p-6" variant="elevated">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          ) : null}
        </div>
        <div className="pt-4">{children}</div>
      </Card>
    </div>
  );
}
