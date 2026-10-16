import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiderados } from "./useEntregas";

const { from, select, eq, order } = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "leader-1" } }),
}));

describe("useLiderados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ select });
    select.mockReturnValue({ eq, order });
    eq.mockReturnValue({ order });
    order.mockResolvedValue({ data: [], error: null });
  });

  it("filters collaborators by the current leader when a leader scope is provided", async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLiderados("leader-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(from).toHaveBeenCalledWith("liderados");
    expect(eq).toHaveBeenCalledWith("gestor_id", "leader-1");
    expect(order).toHaveBeenCalledWith("nome");
  });

  it("does not apply a leader filter when an administrator requests the whole team", async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLiderados(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eq).not.toHaveBeenCalled();
    expect(order).toHaveBeenCalledWith("nome");
  });
});
