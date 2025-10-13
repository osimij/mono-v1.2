import type { ThemeProviderProps as InternalThemeProviderProps } from "@/hooks/use-theme";
import { ThemeProvider as InternalThemeProvider } from "@/hooks/use-theme";

type ThemeConfigProps = InternalThemeProviderProps & {
  attribute?: string;
  enableSystem?: boolean;
};

export function ThemeProvider({
  children,
  attribute: _attribute,
  enableSystem: _enableSystem = true,
  ...props
}: ThemeConfigProps) {
  return <InternalThemeProvider {...props}>{children}</InternalThemeProvider>;
}
