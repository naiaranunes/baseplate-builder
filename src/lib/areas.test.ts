import { describe, expect, it } from "vitest";
import { SETORES } from "./areas";

describe("SETORES", () => {
  it("contains the organization sectors in the requested order", () => {
    expect(SETORES).toEqual([
      "Diretoria e Gestão",
      "Engenharia e Projetos",
      "Operações e Execução de Obras",
      "Produção e Asfalto",
      "Comercial e Vendas",
      "Atendimento ao Cliente",
      "Compras e Suprimentos",
      "Logística e Transporte",
      "Financeiro",
      "Administrativo e Recursos Humanos",
      "Qualidade, Segurança e Meio Ambiente",
      "Tecnologia, Processos e Inteligência Artificial",
      "Marketing e Comunicação",
    ]);
  });
});
