export type EntregaStatus = "pendente" | "em_andamento" | "entregue" | "aprovada" | "devolvida";
export type StatusExibido = EntregaStatus | "atrasada";
export type Periodicidade = "unica" | "diaria" | "semanal" | "quinzenal" | "mensal" | "trimestral";
/** Situação em relação ao prazo, usada em agenda, painel e reunião. */
export type Situacao = "atrasada" | "proxima" | "no_prazo" | "concluida";

export const STATUS_LABEL: Record<StatusExibido, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  entregue: "Entregue",
  aprovada: "Aprovada",
  devolvida: "Devolvida",
  atrasada: "Atrasada",
};

export const SITUACAO_LABEL: Record<Situacao, string> = {
  atrasada: "Em atraso",
  proxima: "Próxima do vencimento",
  no_prazo: "No prazo",
  concluida: "Concluída",
};

/** Janela (em horas) para considerar uma entrega "próxima do vencimento". */
export const HORAS_PROXIMO = 48;

export const STATUS_OPCOES: EntregaStatus[] = ["pendente", "em_andamento", "entregue", "aprovada", "devolvida"];

export const PERIODICIDADE_LABEL: Record<Periodicidade, string> = {
  unica: "Única",
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  trimestral: "Trimestral",
};

/** Data de hoje no fuso local (evita virar o dia antes da hora no Brasil). */
export const hojeISO = (agora: Date = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
};

export const isConcluida = (s: EntregaStatus) => s === "entregue" || s === "aprovada";

/** Momento-limite do prazo: data + hora informada, ou fim do dia quando sem hora. */
export function limitePrazo(prazo: string, hora?: string | null): Date {
  const h = hora ? hora.slice(0, 5) : "23:59";
  return new Date(`${prazo}T${h}:${hora ? "00" : "59"}`);
}

export function situacao(
  e: { status: EntregaStatus; prazo: string; prazo_hora?: string | null },
  agora: Date = new Date(),
): Situacao {
  if (isConcluida(e.status)) return "concluida";
  const limite = limitePrazo(e.prazo, e.prazo_hora).getTime();
  const t = agora.getTime();
  if (t > limite) return "atrasada";
  if (limite - t <= HORAS_PROXIMO * 3600_000) return "proxima";
  return "no_prazo";
}

/** Status exibido: "atrasada" quando o prazo (com hora) passou e ainda não foi concluída. */
export function statusExibido(status: EntregaStatus, prazo: string, agora: Date | string = new Date(), hora?: string | null): StatusExibido {
  const now = typeof agora === "string" ? new Date(`${agora}T00:00:00`) : agora;
  return situacao({ status, prazo, prazo_hora: hora }, now) === "atrasada" ? "atrasada" : status;
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

export const fmtPrazo = (prazo: string, hora?: string | null) =>
  new Date(prazo + "T00:00:00").toLocaleDateString("pt-BR") + (hora ? ` ${hora.slice(0, 5)}` : "");
