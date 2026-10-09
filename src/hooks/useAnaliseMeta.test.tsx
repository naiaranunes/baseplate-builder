import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { MetaWithResponsavel } from "@/lib/metas";
import { useAnaliseMeta } from "./useAnaliseMeta";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke }, from: mocks.from },
}));

describe("Análise sem Plano de Ação", () => {
  it("analisa a entrega sem consultar ou enviar planos de ação", async () => {
    const result = { diagnostico: "Regular", acoes: [], previsao_final: 10, vai_bater: true };
    mocks.invoke.mockResolvedValue({ data: result, error: null });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const hook = renderHook(() => useAnaliseMeta(), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    const meta = { id: "entrega-1", nome: "Entrega mensal", valor_alvo: 10 } as MetaWithResponsavel;
    await act(async () => { await hook.result.current.mutateAsync({ meta, lancamentos: [] }); });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledWith("analise-meta", {
      body: expect.objectContaining({ meta_id: "entrega-1", historico: [] }),
    });
    expect(mocks.invoke.mock.calls[0][1].body).not.toHaveProperty("planos");
    await waitFor(() => expect(hook.result.current.data).toEqual(result));
  });
});