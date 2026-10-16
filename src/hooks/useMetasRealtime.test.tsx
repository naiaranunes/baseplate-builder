import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMetas } from "./useMetas";

const { channel, callbacks, from, removeChannel } = vi.hoisted(() => {
  const handlers: Array<() => void> = [];
  const instance = {
    on: vi.fn((_event: string, _filter: { table: string }, callback: () => void) => {
      handlers.push(callback);
      return instance;
    }),
    subscribe: vi.fn(() => instance),
  };

  return {
    callbacks: handlers,
    channel: vi.fn(() => instance),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
    removeChannel: vi.fn(async () => "ok"),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { channel, from, removeChannel },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin-1" } }),
}));

describe("useMetas realtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callbacks.length = 0;
  });

  it("refreshes dashboard metas when metas or results change", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const hook = renderHook(() => useMetas(), { wrapper });

    expect(channel).toHaveBeenCalledOnce();
    expect(callbacks).toHaveLength(2);
    callbacks[1]();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["metas"] });
    });

    hook.unmount();
    queryClient.clear();
  });
});
