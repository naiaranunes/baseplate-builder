import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RecoveryRedirect } from "./RecoveryRedirect";

const { useAuth } = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth }));

function CurrentPath() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

describe("RecoveryRedirect", () => {
  it("redirects a recovery session from any route to the new password form", async () => {
    useAuth.mockReturnValue({ isPasswordRecovery: true });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RecoveryRedirect />
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/reset-password" element={<div>Formulário de nova senha</div>} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Formulário de nova senha")).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/reset-password");
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("does not redirect normal sessions", () => {
    useAuth.mockReturnValue({ isPasswordRecovery: false });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RecoveryRedirect />
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/reset-password" element={<div>Formulário de nova senha</div>} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/dashboard");
  });
});
