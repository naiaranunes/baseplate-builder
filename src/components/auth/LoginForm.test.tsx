import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ signIn: vi.fn() }),
}));

describe("LoginForm", () => {
  it("shows the forgot-password link below the password field", () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Esqueceu sua senha?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
