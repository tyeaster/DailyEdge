import { animations } from "./animations";
import { colors } from "./colors";
import { shadows } from "./shadows";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const theme = {
  colors,
  spacing,
  typography,
  shadows,
  animations,
  radii: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-[1.5rem]",
  },
} as const;
