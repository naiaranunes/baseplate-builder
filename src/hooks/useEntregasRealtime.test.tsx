import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEntregas } from "./useEntregas";

const { channel, from, removeChannel } = vi.hoisted(() => {
  const channels = new Map<string, {
    subscribed: boolean;
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  }>();

  return {
    channel: vi.fn((topic: string) => {
      const existing = channels.get(topic);
      if (existing) return existing;

      const instance = {
        subscribed: false,
        on: vi.fn(function (this: { subscribed: boolean }) {
          if (this.subscribed) throw new Error("Cannot add callbacks after subscribe()");
          return instance;
        }),
        subscribe: vi.fn(() => {
          instance.subscribed = true;
          return instance;
        }),
      };
      channels.set(topic, instance);
      return instance;
    }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
    removeChannel: vi.fn(async (instance: { subscribed: boolean }) => {
      instance.subscribed = false;
      return "ok";
    }),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { channel, from, removeChannel },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "leader-1" } }),
}));

describe("useEntregas realtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a distinct channel when multiple components subscribe to deliveries", () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useEntregas(), { wrapper });
    const second = renderHook(() => useEntregas(), { wrapper });

    expect(channel).toHaveBeenCalledTimes(2);
    expect(channel.mock.calls[0][0]).not.toBe(channel.mock.calls[1][0]);

    first.unmount();
    second.unmount();
    queryClient.clear();
  });
});
