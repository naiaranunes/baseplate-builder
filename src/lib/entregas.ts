export type EntregaStatus = "pendente" | "em_andamento" | "entregue" | "aprovada" | "devolvida";
export type StatusExibido = EntregaStatus | "atrasada";

export const STATUS_LABEL: Record<StatusExibido, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  entregue: "Entregue",
  aprovada: "Aprovada",
  devolvida: "Devolvida",
  atrasada: "Atrasada",
};

export const STATUS_OPCOES: EntregaStatus[] = ["pendente", "em_andamento", "entregue", "aprovada", "devolvida"];

/** Uma entrega fica "atrasada" quando o prazo passou e ainda não foi entregue nem aprovada. */
export function statusExibido(status: EntregaStatus, prazo: string, hoje: string = new Date().toISOString().slice(0, 10)): StatusExibido {
  if ((status === "pendente" || status === "em_andamento" || status === "devolvida") && prazo < hoje) return "atrasada";
  return status;
}
