import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AuthPage from "./AuthPage";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isApproved: true,
    isLoading: false,
    isPasswordRecovery: true,
  }),
}));

vi.mock("@/components/auth/AuthLayout", () => ({
  AuthLayout: () => <div>Login</div>,
}));

function CurrentPath() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

describe("AuthPage", () => {
  it("routes recovery sessions to the new-password form instead of the dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<div>Formulário de nova senha</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Formulário de nova senha")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/reset-password");
    });
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});
