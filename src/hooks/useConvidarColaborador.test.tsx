import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConvidarColaborador } from "./useEntregas";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke } },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "leader-1" } }),
}));

describe("useConvidarColaborador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoke.mockResolvedValue({ data: { status: "convidado" }, error: null });
  });

  it("sends the new collaborator to the published invite-acceptance form", async () => {
    vi.stubEnv("VITE_APP_URL", "");
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useConvidarColaborador(), { wrapper });

    result.current.mutate("collaborator-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith("convidar-colaborador", {
      body: {
        liderado_id: "collaborator-1",
        redirect_to: "https://baseplate-builder.lovable.app/accept-invite",
      },
    });
  });
});
