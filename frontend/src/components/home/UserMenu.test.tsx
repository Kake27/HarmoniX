import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { UserMenu } from "./UserMenu";

function renderMenu(overrides: Partial<ComponentProps<typeof UserMenu>> = {}) {
  const props: ComponentProps<typeof UserMenu> = {
    name: "Ada Listener",
    email: "listener@example.com",
    initials: "AL",
    signingOut: false,
    onSignOut: vi.fn(),
    ...overrides,
  };
  return { ...render(<UserMenu {...props} />), props };
}

describe("UserMenu", () => {
  it("opens and closes the account menu with keyboard and outside interaction", () => {
    renderMenu();
    const toggle = screen.getByRole("button", { name: /ada listener/i });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("listener@example.com")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes before invoking sign-out", () => {
    const onSignOut = vi.fn();
    renderMenu({ onSignOut });
    fireEvent.click(screen.getByRole("button", { name: /ada listener/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));

    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("disables sign-out and reports its pending state", () => {
    renderMenu({ signingOut: true });
    fireEvent.click(screen.getByRole("button", { name: /ada listener/i }));

    expect(screen.getByRole("menuitem", { name: "Logging out..." })).toBeDisabled();
  });
});
