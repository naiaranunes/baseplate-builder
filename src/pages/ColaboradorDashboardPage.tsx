import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, PackageCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useEntregas } from "@/hooks/useEntregas";
import { hojeISO, isConcluida, PERIODICIDADE_LABEL, statusExibido, STATUS_LABEL } from "@/lib/entregas";

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");

export default function ColaboradorDashboardPage() {
  const { profile } = useAuth();
  const { data: entregas = [], isLoading, isError, error, refetch } = useEntregas();
  const hoje = hojeISO();
  const abertas = entregas.filter((entrega) => !isConcluida(entrega.status));
  const atrasadas = abertas.filter((entrega) => entrega.prazo < hoje);
  const previstas = abertas.filter((entrega) => entrega.prazo >= hoje);
  const concluidas = entregas.filter((entrega) => isConcluida(entrega.status));
  const proximas = [...abertas].sort((a, b) => a.prazo.localeCompare(b.prazo)).slice(0, 5);
  const primeiroNome = profile?.full_name?.split(" ")[0];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Olá{primeiroNome ? `, ${primeiroNome}` : ""}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Este é o resumo das suas entregas e dos próximos prazos.
            </p>
          </div>
          <Button asChild>
            <Link to="/minhas-entregas">
              Ver minhas entregas <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)}
          </div>
        ) : isError ? (
          <div role="alert" className="rounded-lg border border-destructive/40 p-6 text-center">
            <p className="text-sm text-destructive">
              Não foi possível carregar suas entregas: {error.message}
            </p>
            <Button className="mt-3" variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo das entregas">
              <SummaryCard label="Pendentes" value={abertas.length} icon={<PackageCheck className="h-4 w-4" />} />
              <SummaryCard label="Atrasadas" value={atrasadas.length} icon={<AlertTriangle className="h-4 w-4" />} />
              <SummaryCard label="No prazo" value={previstas.length} icon={<CalendarClock className="h-4 w-4" />} />
              <SummaryCard label="Finalizadas" value={concluidas.length} icon={<CheckCircle2 className="h-4 w-4" />} />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Próximas entregas</h2>
                  <p className="text-sm text-muted-foreground">
                    Abra uma entrega para registrar quando concluir.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/minhas-entregas">Todas</Link>
                </Button>
              </div>

              {proximas.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">Você não tem entregas pendentes.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Quando uma nova entrega for atribuída, ela aparecerá aqui.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border bg-card">
                  {proximas.map((entrega) => {
                    const status = statusExibido(entrega.status, entrega.prazo);
                    return (
                      <Link
                        key={entrega.id}
                        to={`/minhas-entregas?entrega=${encodeURIComponent(entrega.id)}`}
                        className="flex flex-wrap items-center justify-between gap-3 border-b p-4 last:border-b-0 hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{entrega.titulo}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Prazo: {formatDate(entrega.prazo)} · {PERIODICIDADE_LABEL[entrega.periodicidade]}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={status === "atrasada" || status === "devolvida" ? "destructive" : "outline"}>
                            {STATUS_LABEL[status]}
                          </Badge>
                          <span className="text-sm font-medium text-primary">Entregar</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/perfil">Personalizar meu perfil</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
      <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
    </div>
  );
}
