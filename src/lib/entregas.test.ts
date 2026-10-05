import { describe, it, expect } from "vitest";
import { statusExibido } from "./entregas";

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
