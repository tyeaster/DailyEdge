import type { HTMLAttributes } from "react";

import { cn } from "@/src/lib/cn";

export type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: ContainerProps) {
  return <div className={cn("mx-auto max-w-7xl px-6 lg:px-8", className)} {...props} />;
}
