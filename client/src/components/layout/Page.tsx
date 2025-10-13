import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const SHELL_PADDING = {
  none: "px-0 py-0",
  sm: "px-4 py-6 md:px-6",
  md: "px-6 py-8 md:px-8",
  lg: "px-8 py-10 md:px-12",
} as const;

const SHELL_WIDTH = {
  default: "max-w-7xl",
  wide: "max-w-[1440px]",
  full: "max-w-none",
} as const;

export interface PageShellProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  padding?: keyof typeof SHELL_PADDING;
  width?: keyof typeof SHELL_WIDTH;
}

export function PageShell({
  children,
  className,
  contentClassName,
  padding = "md",
  width = "default",
}: PageShellProps) {
  return (
    <div className={cn("w-full text-text-primary", className)}>
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-8",
          SHELL_WIDTH[width],
          SHELL_PADDING[padding],
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  footer,
  align = "left",
  className,
}: PageHeaderProps) {
  const alignment =
    align === "center"
      ? "items-center text-center"
      : "items-start text-left";

  return (
    <header
      className={cn(
        "flex flex-col gap-6 rounded-2xl bg-surface-elevated/60 px-6 py-6 shadow-xs backdrop-blur-sm md:px-8",
        alignment,
        className,
      )}
    >
      <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className={cn("flex flex-col gap-2", alignment)}>
          {eyebrow ? (
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-subtle">
              {eyebrow}
            </span>
          ) : null}
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold leading-tight text-text-primary md:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-base text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {footer ? <div className="w-full">{footer}</div> : null}
    </header>
  );
}

export interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  surface?: "card" | "muted" | "transparent";
  bleed?: boolean;
}

const SURFACE_CLASS: Record<
  NonNullable<PageSectionProps["surface"]>,
  string
> = {
  card: "bg-surface-elevated shadow-sm",
  muted: "bg-surface-muted",
  transparent: "",
};

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  surface = "card",
  bleed,
}: PageSectionProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-6 rounded-2xl",
        SURFACE_CLASS[surface],
        bleed ? "px-0" : "px-6 md:px-8",
        "py-6 md:py-8",
        className,
      )}
    >
      {(title || description || actions) && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            {title ? (
              <h2 className="text-xl font-semibold leading-tight text-text-primary md:text-2xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="max-w-2xl text-sm text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      )}
      <div className={cn("flex flex-col gap-6", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
