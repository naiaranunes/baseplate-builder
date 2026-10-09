import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, statusExibido, type EntregaStatus } from "@/lib/entregas";
import { useAuth } from "@/hooks/useAuth";

type DeliveryNotification = {
  id: string;
  titulo: string;
  status: EntregaStatus;
  prazo: string;
  updated_at: string;
};

function useDeliveryNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", "deliveries", user?.id],
    queryFn: async (): Promise<DeliveryNotification[]> => {
      const { data, error } = await supabase
        .from("entregas")
        .select("id, titulo, status, prazo, updated_at")
        .order("prazo", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as DeliveryNotification[];
    },
    refetchInterval: 60_000,
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_ICON: Record<"pendente" | "em_andamento" | "entregue" | "aprovada" | "devolvida" | "atrasada", React.ReactNode> = {
  pendente: <Clock3 className="h-4 w-4 text-muted-foreground" />,
  em_andamento: <Clock3 className="h-4 w-4" style={{ color: "var(--color-amber)" }} />,
  entregue: <CheckCircle2 className="h-4 w-4" style={{ color: "var(--color-green)" }} />,
  aprovada: <CheckCircle2 className="h-4 w-4" style={{ color: "var(--color-green)" }} />,
  devolvida: <AlertCircle className="h-4 w-4" style={{ color: "var(--color-red)" }} />,
  atrasada: <AlertTriangle className="h-4 w-4" style={{ color: "var(--color-red)" }} />,
};

export function NotificationsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { role } = useAuth();
  const { data: notifs, isLoading, isError } = useDeliveryNotifications();
  const destination = role === "agent" ? "/minhas-entregas" : "/agenda-entregas";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Notificações</SheetTitle>
          <SheetDescription>
            {role === "agent" ? "Prazos e atualizações das entregas atribuídas a você." : "Prazos e atualizações das entregas da equipe."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-sm text-destructive">
              Não foi possível carregar as notificações. Tente novamente em instantes.
            </div>
          ) : !notifs || notifs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma entrega atribuída no momento.
            </div>
          ) : (
            <ul className="space-y-1">
              {notifs.map((n) => (
                <li key={n.id}>
                  <Link
                    to={`${destination}?entrega=${n.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">{STATUS_ICON[statusExibido(n.status, n.prazo)]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.titulo}</div>
                      <div className="text-xs text-muted-foreground">
                        {STATUS_LABEL[statusExibido(n.status, n.prazo)]} · prazo {new Date(`${n.prazo}T00:00:00`).toLocaleDateString("pt-BR")} · atualizada {relativeTime(n.updated_at)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
