export type EntregaStatus = "pendente" | "em_andamento" | "entregue" | "aprovada" | "devolvida";
export type StatusExibido = EntregaStatus | "atrasada";
export type Periodicidade = "unica" | "diaria" | "semanal" | "quinzenal" | "mensal" | "trimestral";

export const STATUS_LABEL: Record<StatusExibido, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  entregue: "Finalizado",
  aprovada: "Aprovada",
  devolvida: "Devolvida",
  atrasada: "Atrasada",
};

export const STATUS_OPCOES: EntregaStatus[] = ["pendente", "em_andamento", "entregue", "aprovada", "devolvida"];

export const PERIODICIDADE_LABEL: Record<Periodicidade, string> = {
  unica: "Única",
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  trimestral: "Trimestral",
};

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const isConcluida = (s: EntregaStatus) => s === "entregue" || s === "aprovada";

/** Fica "atrasada" quando o prazo passou e ainda não foi entregue nem aprovada. */
export function statusExibido(status: EntregaStatus, prazo: string, hoje: string = hojeISO()): StatusExibido {
  if (!isConcluida(status) && prazo < hoje) return "atrasada";
  return status;
}

/** Próximo prazo de uma entrega recorrente; null quando é única. */
export function proximoPrazo(prazo: string, p: Periodicidade): string | null {
  if (p === "unica") return null;
  const d = new Date(prazo + "T12:00:00Z");
  if (p === "diaria") d.setUTCDate(d.getUTCDate() + 1);
  if (p === "semanal") d.setUTCDate(d.getUTCDate() + 7);
  if (p === "quinzenal") d.setUTCDate(d.getUTCDate() + 14);
  if (p === "mensal") d.setUTCMonth(d.getUTCMonth() + 1);
  if (p === "trimestral") d.setUTCMonth(d.getUTCMonth() + 3);
  return d.toISOString().slice(0, 10);
}

/** Entregue no prazo se a data de realização for até o prazo. */
export const noPrazo = (prazo: string, realizacao: string | null) => !!realizacao && realizacao <= prazo;
