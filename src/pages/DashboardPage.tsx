import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Target, TrendingUp, AlertTriangle, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useEntregas, useLiderados, type Entrega } from "@/hooks/useEntregas";
import {
  entregasAtribuidas,
  isConcluida,
  noPrazo,
  situacao,
  SITUACAO_LABEL,
} from "@/lib/entregas";
import { SETORES } from "@/lib/areas";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardPage() {
  const { profile, user, isAdmin } = useAuth();
  const {
    data: entregasAgendadas,
    isLoading: entregasLoading,
    isError: entregasError,
    error: erroEntregas,
  } = useEntregas();
  const {
    data: liderados,
    isLoading: lideradosLoading,
    isError: lideradosError,
    error: erroLiderados,
  } = useLiderados();
  const meusIds = useMemo(
    () => new Set((liderados ?? [])
      .filter((liderado) => liderado.usuario_id === user?.id)
      .map((liderado) => liderado.id)),
    [liderados, user?.id],
  );
  const entregasVisiveis = useMemo(
    () => entregasAtribuidas(entregasAgendadas ?? [], meusIds, isAdmin),
    [entregasAgendadas, isAdmin, meusIds],
  );
  const entregasDashboardLoading = entregasLoading || lideradosLoading;
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setAgora(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const atrasadas = entregasVisiveis
    .filter((entrega) => situacao(entrega, agora) === "atrasada")
    .sort((a, b) => a.prazo.localeCompare(b.prazo));
  const nomePorLiderado = new Map((liderados ?? []).map((liderado) => [liderado.id, liderado.nome]));

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [],
  );

  const summary = useMemo(() => {
    const all = entregasVisiveis;
    return {
      total: all.length,
      noPrazo: all.filter((entrega) => {
        const situacaoAtual = situacao(entrega, agora);
        return situacaoAtual === "no_prazo"
          || (situacaoAtual === "concluida" && noPrazo(entrega.prazo, entrega.data_realizacao));
      }).length,
      emRisco: all.filter((entrega) => situacao(entrega, agora) === "proxima").length,
    };
  }, [entregasVisiveis, agora]);

  const areaCards = useMemo(() => {
    const deliveries = entregasVisiveis;
    const areas = Array.from(new Set([
      ...SETORES,
      ...deliveries.map((delivery) => delivery.area).filter((area): area is string => !!area),
    ]));
    return areas.map((area) => {
      const assigned = deliveries.filter((delivery) => delivery.area === area);
      if (assigned.length === 0) return null;
      const completed = assigned.filter((delivery) => isConcluida(delivery.status)).length;
      const overdue = assigned.filter(
        (delivery) => situacao(delivery, agora) === "atrasada",
      ).length;
      return {
        area,
        count: assigned.length,
        completed,
        overdue,
        pctConcluida: Math.round((completed / assigned.length) * 100),
      };
    }).filter((card) => card !== null);
  }, [entregasVisiveis, agora]);

  const entregasEmRisco = useMemo(() => {
    return entregasVisiveis
      .filter((entrega) => situacao(entrega, agora) === "proxima")
      .sort((a, b) => a.prazo.localeCompare(b.prazo))
      .slice(0, 6);
  }, [entregasVisiveis, agora]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting()}{firstName ? `, ${firstName}` : ""} 👋
            </h1>
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
          </div>
          <Button
            onClick={() => (window.location.href = "/entregas?nova=1")}
            style={{ backgroundColor: "var(--color-blue)", color: "white" }}
            className="hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Entrega
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <SummaryCard
            label="Total de Entregas"
            value={summary.total}
            icon={<Target className="h-4 w-4" />}
            color="var(--color-blue)"
            bg="var(--color-blue-soft)"
            loading={entregasDashboardLoading}
          />
          <SummaryCard
            label="No prazo"
            value={summary.noPrazo}
            icon={<TrendingUp className="h-4 w-4" />}
            color="var(--color-green)"
            bg="var(--color-green-bg)"
            loading={entregasDashboardLoading}
          />
          <SummaryCard
            label="Em risco"
            value={summary.emRisco}
            icon={<AlertCircle className="h-4 w-4" />}
            color="var(--color-amber)"
            bg="var(--color-amber-bg)"
            loading={entregasDashboardLoading}
          />
          <SummaryCard
            label="Entregas atrasadas"
            value={atrasadas.length}
            icon={<AlertTriangle className="h-4 w-4" />}
            color="var(--color-red)"
            bg="var(--color-red-bg)"
            loading={entregasDashboardLoading}
          />
        </div>

        <section>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Entregas atrasadas
            </h2>
            <Link
              to="/entregas"
              className="text-xs font-medium hover:underline"
              style={{ color: "var(--color-blue)" }}
            >
              Abrir agenda →
            </Link>
          </div>
          {entregasDashboardLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : entregasError ? (
            <div role="alert" className="metasia-card p-5 text-sm text-destructive">
              Não foi possível carregar as entregas atrasadas: {erroEntregas.message}
            </div>
          ) : lideradosError ? (
            <div role="alert" className="metasia-card p-5 text-sm text-destructive">
              Não foi possível carregar os nomes dos colaboradores: {erroLiderados.message}
            </div>
          ) : atrasadas.length === 0 ? (
            <div className="metasia-card p-5 text-sm text-muted-foreground">
              Nenhuma entrega em atraso.
            </div>
          ) : (
            <div className="metasia-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Entrega
                    </th>
                    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Colaborador
                    </th>
                    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Prazo
                    </th>
                    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {atrasadas.map((entrega) => (
                    <OverdueDeliveryRow
                      key={entrega.id}
                      entrega={entrega}
                      nome={entrega.liderado_cadastro_id
                        ? nomePorLiderado.get(entrega.liderado_cadastro_id) ?? "—"
                        : "—"}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Painel de saúde por área */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Painel de Entregas por Área
          </h2>
          {entregasDashboardLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : entregasError ? (
            <div role="alert" className="metasia-card p-5 text-sm text-destructive">
              Não foi possível carregar as entregas por setor: {erroEntregas.message}
            </div>
          ) : areaCards.length === 0 ? (
            <div className="metasia-card p-8 text-center text-sm text-muted-foreground">
              Cadastre suas primeiras entregas para ver o painel por área.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {areaCards.map((card) => (
                <AreaCard key={card.area} {...card} />
              ))}
            </div>
          )}
        </section>

        {/* Tabela de entregas em risco */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Entregas em risco
            </h2>
            {entregasEmRisco.length > 0 && (
              <Link
                to="/entregas"
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--color-blue)" }}
              >
                Ver todas →
              </Link>
            )}
          </div>
          {entregasDashboardLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : entregasError ? (
            <div role="alert" className="metasia-card p-5 text-sm text-destructive">
              Não foi possível carregar as entregas em risco: {erroEntregas.message}
            </div>
          ) : entregasEmRisco.length === 0 ? (
            <div
              className="metasia-card p-8 text-center text-sm"
              style={{ borderLeft: "3px solid var(--color-green)" }}
            >
              <div className="mb-2 font-medium">Tudo no prazo 🎉</div>
              <div className="text-muted-foreground">
                Nenhuma entrega em risco no momento.
              </div>
            </div>
          ) : (
            <div className="metasia-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                        Entrega
                      </th>
                      <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                        Responsável
                      </th>
                      <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                        Prazo
                      </th>
                      <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                        Situação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entregasEmRisco.map((entrega) => {
                      const nome = entrega.liderado_cadastro_id
                        ? nomePorLiderado.get(entrega.liderado_cadastro_id) ?? "—"
                        : "—";
                      return (
                        <tr key={entrega.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Link
                              to={`/entregas?entrega=${encodeURIComponent(entrega.id)}`}
                              className="font-medium hover:underline"
                            >
                              {entrega.titulo}
                            </Link>
                          </td>
                          <td className="px-4 py-3">{nome}</td>
                          <td className="px-4 py-3">{new Date(`${entrega.prazo}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{SITUACAO_LABEL[situacao(entrega, agora)]}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

    </AppShell>
  );
}

function OverdueDeliveryRow({ entrega, nome }: { entrega: Entrega; nome: string }) {
  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="px-4 py-3 font-medium">
        <Link
          to={`/entregas?entrega=${encodeURIComponent(entrega.id)}`}
          className="hover:underline"
        >
          {entrega.titulo}
        </Link>
      </td>
      <td className="px-4 py-3">{nome}</td>
      <td className="px-4 py-3">{new Date(`${entrega.prazo}T00:00:00`).toLocaleDateString("pt-BR")}</td>
      <td className="px-4 py-3"><Badge variant="destructive">Atrasada</Badge></td>
    </tr>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  bg,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  loading: boolean;
}) {
  return (
    <div className="metasia-card p-4 flex items-start justify-between gap-2">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <div className="text-3xl font-bold" style={{ color }}>
            {value}
          </div>
        )}
      </div>
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: bg, color }}
      >
        {icon}
      </div>
    </div>
  );
}

function AreaCard({
  area,
  count,
  completed,
  overdue,
  pctConcluida,
}: {
  area: string;
  count: number;
  completed: number;
  overdue: number;
  pctConcluida: number;
}) {
  return (
    <Link
      to={`/gestao-entregas?area=${encodeURIComponent(area)}`}
      className="metasia-card p-4 block hover:bg-muted/30 transition-colors"
      style={overdue > 0 ? { borderLeft: "3px solid var(--color-red)" } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm">{area}</h3>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {count} {count === 1 ? "entrega atribuída" : "entregas atribuídas"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">{pctConcluida}%</div>
          <div className="text-[10px] text-muted-foreground">concluídas</div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-success transition-all" style={{ width: `${pctConcluida}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {completed} concluídas · {overdue} em atraso
      </p>
    </Link>
  );
}
