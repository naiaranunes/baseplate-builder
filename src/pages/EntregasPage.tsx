import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, PackageCheck, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  type Entrega, type Liderado, useAddComentario, useConvidarColaborador, useCreateEntrega, useEntregas, useExcluirEntrega, useExcluirLiderado,
  useHistorico, useLiderados, useMembros, useRegistrarRealizacao, useSalvarLiderado, useUpdateStatus,
} from "@/hooks/useEntregas";
import {
  PERIODICIDADE_LABEL, SITUACAO_LABEL, STATUS_LABEL, STATUS_OPCOES, fmtPrazo, hojeISO, isConcluida, noPrazo, situacao, statusExibido,
  type EntregaStatus, type Periodicidade, type Situacao, type StatusExibido,
} from "@/lib/entregas";

const STATUS_VARIANT: Record<StatusExibido, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "outline", em_andamento: "secondary", entregue: "default", aprovada: "default", devolvida: "destructive", atrasada: "destructive",
};
const fmt = (d: string) => new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR");
const SIT_CLASS: Record<Situacao, string> = {
  atrasada: "bg-destructive text-destructive-foreground",
  proxima: "bg-warning text-warning-foreground",
  no_prazo: "bg-success text-success-foreground",
  concluida: "bg-secondary text-secondary-foreground",
};

function StatusBadge({ e }: { e: Entrega }) {
  const s = statusExibido(e.status, e.prazo, new Date(), e.prazo_hora);
  const sit = situacao(e);
  return (
    <div className="flex flex-wrap gap-1">
      <Badge className={SIT_CLASS[sit]}>{SITUACAO_LABEL[sit]}</Badge>
      {s !== "atrasada" && sit !== "concluida" && <Badge variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</Badge>}
    </div>
  );
}

export default function EntregasPage({ mode }: { mode: "agenda" | "mine" }) {
  const isMine = mode === "mine";
  const { isAdmin, isSupervisor } = useAuth();
  const canManage = isAdmin || isSupervisor;
  const { data: entregas, isLoading } = useEntregas();
  const { data: liderados } = useLiderados();
  const { user, isAdmin, isSupervisor } = useAuth();
  const [novoOpen, setNovoOpen] = useState(() => new URLSearchParams(window.location.search).has("nova"));
  const [selecionada, setSelecionada] = useState<Entrega | null>(null);
  const [pessoa, setPessoa] = useState("todos");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const entregaId = searchParams.get("entrega");
    if (!entregaId || !entregas) return;
    const found = entregas.find((entrega) => entrega.id === entregaId);
    if (found) setSelecionada(found);
  }, [entregas, searchParams]);

  const nomeLiderado = useMemo(() => {
    const m = new Map((liderados ?? []).map((l) => [l.id, l.nome]));
    return (id: string | null) => (id && m.get(id)) || "—";
  }, [liderados]);

  // Colaborador (sem papel de líder) vê apenas as tarefas atribuídas a ele.
  const isLider = isAdmin || isSupervisor;
  const meusIds = new Set((liderados ?? []).filter((l) => (l.email ?? "").toLowerCase() === (user?.email ?? "").toLowerCase()).map((l) => l.id));
  // Líder vê as entregas dos seus liderados (o banco já restringe); colaborador vê só as dele.
  const visiveis = isLider ? (entregas ?? []) : (entregas ?? []).filter((e) => e.liderado_cadastro_id && meusIds.has(e.liderado_cadastro_id));
  const todas = visiveis.filter((e) => pessoa === "todos" || e.liderado_cadastro_id === pessoa);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{isLider ? "Agenda de Entregas" : "Minhas tarefas"}</h1>
            <p className="text-sm text-muted-foreground">O que cada pessoa deve entregar, quando, se entregou e qual a situação.</p>
          </div>
          {isLider && <div className="flex gap-2">
            <Select value={pessoa} onValueChange={setPessoa}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os liderados</SelectItem>
                {(liderados ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => (liderados?.length ? setNovoOpen(true) : toast.error("Cadastre um liderado primeiro."))}>
              <Plus className="h-4 w-4 mr-1.5" />Nova entrega
            </Button>
          </div>}
        </div>

        <Tabs defaultValue="agenda">
          <TabsList>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            {isLider && <TabsTrigger value="reuniao">Visão para reunião</TabsTrigger>}
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {isLoading ? <Skeleton className="h-48 w-full mt-4" /> : (
            <>
              <TabsContent value="agenda"><Agenda entregas={todas} nome={nomeLiderado} onOpen={setSelecionada} /></TabsContent>
              <TabsContent value="reuniao"><Reuniao entregas={todas} liderados={(liderados ?? []).filter((l) => !meusIds.has(l.id) && (pessoa === "todos" || l.id === pessoa))} /></TabsContent>
              <TabsContent value="historico"><HistoricoGeral entregas={todas} nome={nomeLiderado} onOpen={setSelecionada} /></TabsContent>
            </>
          )}
        </div>
        {errorLiderados && canManage && (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar os colaboradores: {lideradosError.message}
          </p>
        )}

        {isMine ? (
          isLoading
            ? <Skeleton className="h-48 w-full mt-4" />
            : <MinhasEntregas entregas={todas} onOpen={setSelecionada} />
        ) : (
          <Tabs defaultValue="agenda">
            <TabsList>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
              <TabsTrigger value="reuniao">Visão para reunião</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="liderados">Colaboradores</TabsTrigger>
            </TabsList>

            {isLoading ? <Skeleton className="h-48 w-full mt-4" /> : (
              <>
                <TabsContent value="agenda"><Agenda entregas={todas} nome={nomeLiderado} onOpen={setSelecionada} /></TabsContent>
                <TabsContent value="reuniao"><Reuniao entregas={todas} liderados={(liderados ?? []).filter((l) => pessoa === "todos" || l.id === pessoa)} /></TabsContent>
                <TabsContent value="historico"><HistoricoGeral entregas={todas} nome={nomeLiderado} onOpen={setSelecionada} /></TabsContent>
                <TabsContent value="liderados"><LideradosTab liderados={(liderados ?? []).filter((l) => l.ativo)} entregas={entregas ?? []} /></TabsContent>
              </>
            )}
          </Tabs>
        )}
      </div>

      <NovaEntregaDialog open={novoOpen} onOpenChange={setNovoOpen} liderados={(liderados ?? []).filter((l) => l.ativo && !meusIds.has(l.id))} />
      <DetalheEntrega entrega={selecionada} onClose={() => setSelecionada(null)} nome={nomeLiderado} />
    </AppShell>
  );
}

function MinhasEntregas({ entregas, onOpen }: { entregas: Entrega[]; onOpen: (entrega: Entrega) => void }) {
  if (entregas.length === 0) {
    return <div className="metasia-card mt-4 p-8 text-center text-sm text-muted-foreground">Você ainda não tem entregas atribuídas.</div>;
  }

  return (
    <div className="metasia-card mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr>
            <th className="p-3">Entrega</th>
            <th className="p-3">Periodicidade</th>
            <th className="p-3">Prazo</th>
            <th className="p-3">Realizada em</th>
            <th className="p-3">Situação</th>
            <th className="p-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {entregas.map((entrega) => (
            <tr
              key={entrega.id}
              className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
              onClick={() => onOpen(entrega)}
            >
              <td className="p-3 font-medium">{entrega.titulo}</td>
              <td className="p-3">{PERIODICIDADE_LABEL[entrega.periodicidade]}</td>
              <td className="p-3">{fmt(entrega.prazo)}</td>
              <td className="p-3">{entrega.data_realizacao ? fmt(entrega.data_realizacao) : "—"}</td>
              <td className="p-3"><StatusBadge e={entrega} /></td>
              <td className="p-3 text-right">
                {!isConcluida(entrega.status) && (
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={`Entregar ${entrega.titulo}`}
                    title="Entregar"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(entrega);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaEntregas({ itens, nome, onOpen, vazio }: { itens: Entrega[]; nome: (id: string | null) => string; onOpen: (e: Entrega) => void; vazio: string }) {
  const excluir = useExcluirEntrega();
  const apagar = async (e: Entrega) => {
    if (!confirm(`Excluir a entrega "${e.titulo}"?`)) return;
    try { await excluir.mutateAsync(e.id); toast.success("Entrega excluída."); } catch (err) { toast.error((err as Error).message); }
  };
  if (!itens.length) return <p className="text-sm text-muted-foreground p-4">{vazio}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr><th className="p-3">Liderado</th><th className="p-3">Entrega</th><th className="p-3">Periodicidade</th><th className="p-3">Prazo</th><th className="p-3">Realizada em</th><th className="p-3">Situação</th><th /></tr>
        </thead>
        <tbody>
          {itens.map((e) => (
            <tr key={e.id} className="border-b last:border-0 cursor-pointer hover:bg-muted/50" onClick={() => onOpen(e)}>
              <td className="p-3">{nome(e.liderado_cadastro_id)}</td>
              <td className="p-3 font-medium">{e.titulo}</td>
              <td className="p-3">{PERIODICIDADE_LABEL[e.periodicidade]}</td>
              <td className="p-3 whitespace-nowrap">{fmtPrazo(e.prazo, e.prazo_hora)}</td>
              <td className="p-3">{e.data_realizacao ? fmt(e.data_realizacao) : "—"}</td>
              <td className="p-3"><StatusBadge e={e} /></td>
              <td className="p-3 text-right">
                <Button size="icon" variant="ghost" aria-label="Excluir entrega" onClick={(ev) => { ev.stopPropagation(); apagar(e); }}><Trash2 className="h-4 w-4" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Agenda({ entregas, nome, onOpen }: { entregas: Entrega[]; nome: (id: string | null) => string; onOpen: (e: Entrega) => void }) {
  const agora = new Date();
  const abertas = entregas.filter((e) => !isConcluida(e.status));
  const de = (s: Situacao) => abertas.filter((e) => situacao(e, agora) === s);
  const grupos = [
    { t: "Em atraso", itens: de("atrasada"), vazio: "Nenhuma entrega em atraso." },
    { t: "Próximas do vencimento (48h)", itens: de("proxima"), vazio: "Nada vence nas próximas 48 horas." },
    { t: "No prazo", itens: de("no_prazo"), vazio: "Nenhuma outra entrega prevista." },
  ];
  return (
    <div className="metasia-card mt-4 overflow-x-auto">
      <TabelaEntregas itens={ordenadas} nome={nome} onOpen={onOpen} vazio="Nenhuma entrega agendada." />
    </div>
  );
}

function Reuniao({ entregas, liderados }: { entregas: Entrega[]; liderados: Liderado[] }) {
  const linhas = liderados.map((l) => {
    const es = entregas.filter((e) => e.liderado_cadastro_id === l.id);
    const concluidas = es.filter((e) => isConcluida(e.status));
    const atrasadas = es.filter((e) => situacao(e) === "atrasada");
    const previstas = es.filter((e) => !isConcluida(e.status) && situacao(e) !== "atrasada");
    const emDia = concluidas.filter((e) => noPrazo(e.prazo, e.data_realizacao)).length;
    const pct = concluidas.length ? Math.round((emDia / concluidas.length) * 100) : null;
    return { l, total: es.length, concluidas: concluidas.length, atrasadas, previstas: previstas.length, pct };
  });
  const tot = linhas.reduce((a, r) => ({ total: a.total + r.total, conc: a.conc + r.concluidas, atr: a.atr + r.atrasadas.length, prev: a.prev + r.previstas }), { total: 0, conc: 0, atr: 0, prev: 0 });

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total", tot.total], ["Previstas", tot.prev], ["Atrasadas", tot.atr], ["Realizadas", tot.conc]].map(([t, v]) => (
          <div key={t} className="metasia-card p-4"><div className="text-xs text-muted-foreground">{t}</div><div className="text-2xl font-bold">{v}</div></div>
        ))}
      </div>
      <div className="metasia-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr><th className="p-3">Colaborador</th><th className="p-3">Previstas</th><th className="p-3">Atrasadas</th><th className="p-3">Realizadas</th><th className="p-3">Realizadas no prazo</th><th className="p-3">Pendências</th></tr>
          </thead>
          <tbody>
            {linhas.map((r) => (
              <tr key={r.l.id} className="border-b last:border-0 align-top">
                <td className="p-3 font-medium">{r.l.nome}{r.l.cargo && <div className="text-xs text-muted-foreground">{r.l.cargo}</div>}</td>
                <td className="p-3">{r.previstas}</td>
                <td className="p-3">{r.atrasadas.length ? <Badge variant="destructive">{r.atrasadas.length}</Badge> : 0}</td>
                <td className="p-3">{r.concluidas}</td>
                <td className="p-3">{r.pct === null ? "—" : `${r.pct}%`}</td>
                <td className="p-3 text-xs">{r.atrasadas.map((e) => `${e.titulo} (${fmtPrazo(e.prazo, e.prazo_hora)})`).join(" · ") || "—"}</td>
              </tr>
            ))}
            {!linhas.length && <tr><td className="p-4 text-muted-foreground" colSpan={6}>Cadastre liderados para ver o consolidado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoricoGeral({ entregas, nome, onOpen }: { entregas: Entrega[]; nome: (id: string | null) => string; onOpen: (e: Entrega) => void }) {
  const feitas = entregas.filter((e) => isConcluida(e.status)).sort((a, b) => (b.data_realizacao ?? "").localeCompare(a.data_realizacao ?? ""));
  return <div className="metasia-card mt-4"><TabelaEntregas itens={feitas} nome={nome} onOpen={onOpen} vazio="Nenhuma entrega realizada ainda." /></div>;
}

function NovaEntregaDialog({ open, onOpenChange, liderados }: { open: boolean; onOpenChange: (o: boolean) => void; liderados: Liderado[] }) {
  const create = useCreateEntrega();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [liderado, setLiderado] = useState("");
  const [prazo, setPrazo] = useState("");
  const [hora, setHora] = useState("");
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("unica");

  const [email, setEmail] = useState("");
  const salvarLiderado = useSalvarLiderado();
  const escolherLiderado = (id: string) => { setLiderado(id); setEmail(liderados.find((l) => l.id === id)?.email ?? ""); };

  const salvar = async () => {
    if (!titulo || !liderado || !prazo) return toast.error("Preencha liderado, entrega e prazo.");
    const mail = email.trim().toLowerCase();
    if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return toast.error("E-mail inválido.");
    try {
      const atual = liderados.find((l) => l.id === liderado);
      if (mail && atual && (atual.email ?? "").toLowerCase() !== mail) {
        await salvarLiderado.mutateAsync({ id: liderado, nome: atual.nome, email: mail });
      }
      await create.mutateAsync({ titulo, descricao: descricao || undefined, liderado_cadastro_id: liderado, prazo, prazo_hora: hora || null, periodicidade });
      if (mail) {
        const { data, error } = await supabase.functions.invoke("convidar-colaborador", { body: { liderado_id: liderado, redirect_to: window.location.origin } });
        if (error || data?.error) toast.error("Entrega agendada, mas o convite falhou: " + (data?.error ?? error?.message));
        else toast.success(data?.status === "ja_cadastrado" ? "Entrega agendada. O colaborador já tem acesso e verá a tarefa." : "Entrega agendada e convite enviado por e-mail.");
      } else toast.success("Entrega agendada.");
      setTitulo(""); setDescricao(""); setPrazo(""); setHora(""); setPeriodicidade("unica"); setEmail(""); setLiderado("");
      onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova entrega</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Liderado *</Label>
            <Select value={liderado} onValueChange={escolherLiderado}>
              <SelectTrigger><SelectValue placeholder="Quem deve entregar" /></SelectTrigger>
              <SelectContent>
                {liderados.length
                  ? liderados.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)
                  : <SelectItem value="__empty__" disabled>Nenhum colaborador ativo cadastrado.</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {liderado && <div><Label>E-mail do colaborador (convite de acesso)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" />
            <p className="text-xs text-muted-foreground mt-1">O colaborador recebe um convite por e-mail, acessa o sistema e vê as tarefas atribuídas a ele.</p>
          </div>}
          <div><Label>Entrega *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Relatório de vendas" /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{periodicidade === "unica" ? "Prazo *" : "Primeiro prazo *"}</Label><Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
            <div><Label>Horário limite</Label><Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /><p className="text-xs text-muted-foreground mt-1">Sem horário, vale até o fim do dia.</p></div>
            <div><Label>Periodicidade</Label>
              <Select value={periodicidade} onValueChange={(v) => setPeriodicidade(v as Periodicidade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(PERIODICIDADE_LABEL) as Periodicidade[]).map((p) => <SelectItem key={p} value={p}>{PERIODICIDADE_LABEL[p]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {periodicidade !== "unica" && <p className="text-xs text-muted-foreground">Ao registrar a realização, a próxima entrega é agendada automaticamente.</p>}
        </div>
        <DialogFooter><Button onClick={salvar} disabled={create.isPending}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetalheEntrega({
  entrega,
  onClose,
  nome,
  canManage,
  isMine,
}: {
  entrega: Entrega | null;
  onClose: () => void;
  nome: (id: string | null) => string;
  canManage: boolean;
  isMine: boolean;
}) {
  const { user } = useAuth();
  const { data: membros } = useMembros();
  const { data: historico } = useHistorico(entrega?.id);
  const update = useUpdateStatus();
  const registrar = useRegistrarRealizacao();
  const comentar = useAddComentario();
  const excluir = useExcluirEntrega();
  const [comentario, setComentario] = useState("");
  const [dataReal, setDataReal] = useState(hojeISO());
  const [obs, setObs] = useState("");
  const nomeMembro = (id: string | null) => membros?.find((m) => m.id === id)?.full_name ?? "—";

  const fechar = () => { onClose(); setComentario(""); setObs(""); setDataReal(hojeISO()); };

  const onRegistrar = async () => {
    if (!entrega) return;
    try {
      const prox = await registrar.mutateAsync({ entrega, data: dataReal, observacao: obs });
      toast.success(prox ? `Entrega registrada. Próxima agendada para ${fmt(prox)}.` : "Entrega registrada.");
      fechar();
    } catch (e) { toast.error((e as Error).message); }
  };
  const mudarStatus = async (s: EntregaStatus) => {
    if (!entrega) return;
    try { await update.mutateAsync({ id: entrega.id, status: s }); toast.success("Situação atualizada."); fechar(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const enviar = async () => {
    if (!entrega || !user || !comentario.trim()) return;
    try { await comentar.mutateAsync({ entrega_id: entrega.id, comentario: comentario.trim(), autor_id: user.id }); setComentario(""); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Sheet open={!!entrega} onOpenChange={(o) => !o && fechar()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {entrega && (
          <>
            <SheetHeader><SheetTitle>{entrega.titulo}</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4 text-sm">
              {entrega.descricao && <p className="text-muted-foreground">{entrega.descricao}</p>}
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Liderado:</span> {nome(entrega.liderado_cadastro_id)}</div>
                <div><span className="text-muted-foreground">Prazo:</span> {fmtPrazo(entrega.prazo, entrega.prazo_hora)}</div>
                <div><span className="text-muted-foreground">Periodicidade:</span> {PERIODICIDADE_LABEL[entrega.periodicidade]}</div>
                <div><StatusBadge e={entrega} /></div>
                {entrega.data_realizacao && <div className="col-span-2"><span className="text-muted-foreground">Realizada em:</span> {fmt(entrega.data_realizacao)} {noPrazo(entrega.prazo, entrega.data_realizacao) ? "(no prazo)" : "(com atraso)"}</div>}
                {entrega.observacao_realizacao && <div className="col-span-2"><span className="text-muted-foreground">Observação:</span> {entrega.observacao_realizacao}</div>}
              </div>

              {!isConcluida(entrega.status) && (
                <div className="metasia-card p-3 space-y-2">
                  <h3 className="font-semibold">Registrar realização</h3>
                  <div><Label>Data da entrega</Label><Input type="date" value={dataReal} onChange={(e) => setDataReal(e.target.value)} /></div>
                  <div><Label>Observação</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
                  <Button onClick={onRegistrar} disabled={registrar.isPending}><CheckCircle2 className="h-4 w-4 mr-1.5" />Marcar como finalizado</Button>
                </div>
              )}

              {canManage && (
                <div>
                  <Label>Alterar situação</Label>
                  <Select value={entrega.status} onValueChange={(v) => mudarStatus(v as EntregaStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPCOES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Comentário / cobrança</Label>
                <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} />
                <Button size="sm" variant="outline" onClick={enviar} disabled={comentar.isPending}>Registrar</Button>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Histórico</h3>
                <ul className="space-y-2">
                  {(historico ?? []).map((h) => (
                    <li key={h.id} className="border-l-2 pl-3">
                      <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")} · {nomeMembro(h.autor_id)}</div>
                      {h.status_novo && <div>{h.status_anterior ? `${STATUS_LABEL[h.status_anterior as EntregaStatus] ?? h.status_anterior} → ` : ""}{STATUS_LABEL[h.status_novo as EntregaStatus] ?? h.status_novo}</div>}
                      {h.comentario && <div>{h.comentario}</div>}
                    </li>
                  ))}
                </ul>
              </div>

              {canManage && !isMine && (
                <Button variant="ghost" className="text-destructive" onClick={async () => { if (confirm("Excluir esta entrega?")) { await excluir.mutateAsync(entrega.id); fechar(); } }}>
                  <Trash2 className="h-4 w-4 mr-1.5" />Excluir entrega
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
