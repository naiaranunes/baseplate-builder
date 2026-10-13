import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "./ForgotPassword";

const { resetPasswordForEmail } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { resetPasswordForEmail },
  },
}));

describe("ForgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_APP_URL", "https://app.example.com");
    resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it("sends the recovery email back to the app's password reset form", async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Seu e-mail"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de recuperação" }));

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
        redirectTo: "https://app.example.com/reset-password",
      });
    });
  });

  it("uses the published app URL when no app URL is configured", async () => {
    vi.stubEnv("VITE_APP_URL", "");

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Seu e-mail"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de recuperação" }));

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
        redirectTo: "https://baseplate-builder.lovable.app/reset-password",
      });
    });
  });
});
