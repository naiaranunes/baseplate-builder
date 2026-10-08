import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { full_name: "Ana" },
    role: "admin",
  }),
}));

vi.mock("@/hooks/useOnboarding", () => ({
  useOnboarding: () => {
    throw new Error("Dashboard must not depend on onboarding state");
  },
}));

vi.mock("@/hooks/useMetas", () => ({
  useMetas: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useMembros: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/components/metas/NovaMetaModal", () => ({
  NovaMetaModal: () => null,
}));

describe("DashboardPage", () => {
  it("permite acessar o dashboard sem consultar ou bloquear por onboarding", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ana/ })).toBeInTheDocument();
  });
});