import { describe, it, expect } from "vitest";
import { noPrazo, proximoPrazo, statusExibido } from "./entregas";

describe("statusExibido", () => {
  it("marca como atrasada quando o prazo passou e está pendente", () => {
    expect(statusExibido("pendente", "2026-01-01", "2026-01-02")).toBe("atrasada");
  });
  it("não marca atrasada se já foi entregue", () => {
    expect(statusExibido("entregue", "2026-01-01", "2026-01-02")).toBe("entregue");
  });
  it("mantém status no próprio dia do prazo", () => {
    expect(statusExibido("em_andamento", "2026-01-02", "2026-01-02")).toBe("em_andamento");
  });
});

describe("proximoPrazo", () => {
  it("única não gera próxima", () => expect(proximoPrazo("2026-01-10", "unica")).toBeNull());
  it("semanal soma 7 dias", () => expect(proximoPrazo("2026-01-10", "semanal")).toBe("2026-01-17"));
  it("quinzenal soma 14 dias", () => expect(proximoPrazo("2026-01-10", "quinzenal")).toBe("2026-01-24"));
  it("mensal soma 1 mês", () => expect(proximoPrazo("2026-01-10", "mensal")).toBe("2026-02-10"));
  it("trimestral soma 3 meses", () => expect(proximoPrazo("2026-01-10", "trimestral")).toBe("2026-04-10"));
});

describe("noPrazo", () => {
  it("entregue após o prazo não está no prazo", () => expect(noPrazo("2026-01-10", "2026-01-11")).toBe(false));
  it("entregue no dia do prazo está no prazo", () => expect(noPrazo("2026-01-10", "2026-01-10")).toBe(true));
});
