import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";

type AuthFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
};

export function AuthField({ label, htmlFor, hint, children }: AuthFieldProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={htmlFor} className="mb-2 text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="m-0 mt-2 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

export function AuthInput({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`h-12 w-full rounded-lg border border-field-line bg-panel px-4 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-subtle hover:border-field-line-hover focus:border-accent focus:ring-[3px] focus:ring-accent/15 motion-reduce:transition-none ${className}`}
      {...props}
    />
  );
}

type AuthMessageProps = {
  tone: "error" | "success";
  role: "alert" | "status";
  children: ReactNode;
};

const messageToneClass = {
  error: "border-danger/30 bg-danger/10 text-danger",
  success: "border-accent/30 bg-accent/10 text-accent",
};

export function AuthMessage({ tone, role, children }: AuthMessageProps) {
  return (
    <p
      role={role}
      className={`m-0 rounded-lg border px-3.5 py-3 text-sm leading-normal ${messageToneClass[tone]}`}
    >
      {children}
    </p>
  );
}

export function AuthSubmit(props: ComponentProps<"button">) {
  return (
    <button
      type="submit"
      className="h-[52px] w-full cursor-pointer rounded-lg border-0 bg-accent text-[15px] font-semibold text-accent-ink transition-[background-color,transform,box-shadow] duration-200 enabled:hover:bg-accent-hover enabled:hover:shadow-[0_8px_24px_rgba(142,243,205,0.2)] enabled:active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      {...props}
    />
  );
}

type AuthPanelHeadingProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function AuthPanelHeading({ eyebrow, title, subtitle }: AuthPanelHeadingProps) {
  return (
    <>
      <p className="m-0 font-mono text-xs tracking-[0.14em] text-accent uppercase">{eyebrow}</p>
      <h1 className="m-0 mt-4 text-[clamp(32px,3.4vw,40px)] leading-[1.15] font-normal tracking-[-0.02em] text-ink">
        {title}
      </h1>
      <p className="m-0 mt-4 mb-10 text-[15px] text-muted">{subtitle}</p>
    </>
  );
}

type AuthSwitchProps = {
  prompt: string;
  to: string;
  label: string;
};

export function AuthSwitch({ prompt, to, label }: AuthSwitchProps) {
  return (
    <p className="m-0 mt-8 text-center text-sm text-muted">
      {prompt}{" "}
      <Link
        to={to}
        className="rounded-sm font-semibold text-accent no-underline transition-colors duration-200 hover:text-accent-hover hover:underline underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent motion-reduce:transition-none"
      >
        {label}
      </Link>
    </p>
  );
}
