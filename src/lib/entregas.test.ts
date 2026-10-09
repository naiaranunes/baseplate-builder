import { describe, it, expect } from "vitest";
import { noPrazo, proximoPrazo, situacao, statusExibido } from "./entregas";

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

describe("situacao com hora", () => {
  const agora = new Date("2026-03-10T14:00:00");
  it("atrasada quando a hora do prazo já passou no mesmo dia", () =>
    expect(situacao({ status: "pendente", prazo: "2026-03-10", prazo_hora: "09:00" }, agora)).toBe("atrasada"));
  it("sem hora vale até o fim do dia", () =>
    expect(situacao({ status: "pendente", prazo: "2026-03-10" }, agora)).toBe("proxima"));
  it("próxima do vencimento dentro de 48h", () =>
    expect(situacao({ status: "em_andamento", prazo: "2026-03-12", prazo_hora: "10:00" }, agora)).toBe("proxima"));
  it("no prazo quando faltam mais de 48h", () =>
    expect(situacao({ status: "pendente", prazo: "2026-03-20" }, agora)).toBe("no_prazo"));
  it("concluída nunca fica em atraso", () =>
    expect(situacao({ status: "entregue", prazo: "2026-01-01" }, agora)).toBe("concluida"));
});
