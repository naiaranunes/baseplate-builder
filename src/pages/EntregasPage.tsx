import { useMemo, useState } from "react";
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
import {
  type Entrega, type Liderado, useAddComentario, useCreateEntrega, useEntregas, useExcluirEntrega, useExcluirLiderado,
  useHistorico, useLiderados, useMembros, useRegistrarRealizacao, useSalvarLiderado, useUpdateStatus,
} from "@/hooks/useEntregas";
import {
  PERIODICIDADE_LABEL, STATUS_LABEL, STATUS_OPCOES, hojeISO, isConcluida, noPrazo, statusExibido,
  type EntregaStatus, type Periodicidade, type StatusExibido,
} from "@/lib/metas";

const STATUS_VARIANT: Record<StatusExibido, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "outline", em_andamento: "secondary", entregue: "default", aprovada: "default", devolvida: "destructive", atrasada: "destructive",
};
const fmt = (d: string) => new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR");
const addDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function StatusBadge({ e }: { e: Entrega }) {
  const s = statusExibido(e.status, e.prazo);
  return <Badge variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</Badge>;
}

export default function EntregasPage() {
  const { data: entregas, isLoading } = useEntregas();
  const { data: liderados } = useLiderados();
  const [novoOpen, setNovoOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<Entrega | null>(null);
  const [pessoa, setPessoa] = useState("todos");

  const nomeLiderado = useMemo(() => {
    const m = new Map((liderados ?? []).map((l) => [l.id, l.nome]));
    return (id: string | null) => (id && m.get(id)) || "—";
  }, [liderados]);

  const todas = (entregas ?? []).filter((e) => pessoa === "todos" || e.liderado_cadastro_id === pessoa);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Agenda de Entregas</h1>
            <p className="text-sm text-muted-foreground">O que cada pessoa deve entregar, quando, se entregou e qual a situação.</p>
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>

        <Tabs defaultValue="agenda">
          <TabsList>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="reuniao">Visão para reunião</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="liderados">Liderados</TabsTrigger>
          </TabsList>

          {isLoading ? <Skeleton className="h-48 w-full mt-4" /> : (
            <>
              <TabsContent value="agenda"><Agenda entregas={todas} nome={nomeLiderado} onOpen={setSelecionada} /></TabsContent>
              <TabsContent value="reuniao"><Reuniao entregas={todas} liderados={(liderados ?? []).filter((l) => pessoa === "todos" || l.id === pessoa)} /></TabsContent>
              <TabsContent value="historico"><HistoricoGeral entregas={todas} nome={nomeLiderado} onOpen={setSelecionada} /></TabsContent>
              <TabsContent value="liderados"><LideradosTab liderados={liderados ?? []} entregas={entregas ?? []} /></TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <NovaEntregaDialog open={novoOpen} onOpenChange={setNovoOpen} liderados={(liderados ?? []).filter((l) => l.ativo)} />
      <DetalheEntrega entrega={selecionada} onClose={() => setSelecionada(null)} nome={nomeLiderado} />
    </AppShell>
  );
}

function TabelaEntregas({ itens, nome, onOpen, vazio }: { itens: Entrega[]; nome: (id: string | null) => string; onOpen: (e: Entrega) => void; vazio: string }) {
  if (!itens.length) return <p className="text-sm text-muted-foreground p-4">{vazio}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr><th className="p-3">Liderado</th><th className="p-3">Entrega</th><th className="p-3">Periodicidade</th><th className="p-3">Prazo</th><th className="p-3">Realizada em</th><th className="p-3">Situação</th></tr>
        </thead>
        <tbody>
          {itens.map((e) => (
            <tr key={e.id} className="border-b last:border-0 cursor-pointer hover:bg-muted/50" onClick={() => onOpen(e)}>
              <td className="p-3">{nome(e.liderado_cadastro_id)}</td>
              <td className="p-3 font-medium">{e.titulo}</td>
              <td className="p-3">{PERIODICIDADE_LABEL[e.periodicidade]}</td>
              <td className="p-3">{fmt(e.prazo)}</td>
              <td className="p-3">{e.data_realizacao ? fmt(e.data_realizacao) : "—"}</td>
              <td className="p-3"><StatusBadge e={e} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Agenda({ entregas, nome, onOpen }: { entregas: Entrega[]; nome: (id: string | null) => string; onOpen: (e: Entrega) => void }) {
  const hoje = hojeISO(); const semana = addDias(7);
  const abertas = entregas.filter((e) => !isConcluida(e.status));
  const grupos = [
    { t: "Atrasadas", itens: abertas.filter((e) => e.prazo < hoje), vazio: "Nenhuma entrega atrasada." },
    { t: "Vencem hoje", itens: abertas.filter((e) => e.prazo === hoje), vazio: "Nada vence hoje." },
    { t: "Próximos 7 dias", itens: abertas.filter((e) => e.prazo > hoje && e.prazo <= semana), vazio: "Nada previsto para a semana." },
    { t: "Mais adiante", itens: abertas.filter((e) => e.prazo > semana), vazio: "Nada previsto." },
  ];
  return (
    <div className="space-y-4 mt-4">
      {grupos.map((g) => (
        <div key={g.t} className="metasia-card">
          <h3 className="font-semibold px-4 pt-4">{g.t} <span className="text-muted-foreground font-normal">({g.itens.length})</span></h3>
          <TabelaEntregas itens={g.itens} nome={nome} onOpen={onOpen} vazio={g.vazio} />
        </div>
      ))}
    </div>
  );
}

function Reuniao({ entregas, liderados }: { entregas: Entrega[]; liderados: Liderado[] }) {
  const hoje = hojeISO();
  const linhas = liderados.map((l) => {
    const es = entregas.filter((e) => e.liderado_cadastro_id === l.id);
    const concluidas = es.filter((e) => isConcluida(e.status));
    const atrasadas = es.filter((e) => !isConcluida(e.status) && e.prazo < hoje);
    const previstas = es.filter((e) => !isConcluida(e.status) && e.prazo >= hoje);
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
            <tr><th className="p-3">Liderado</th><th className="p-3">Previstas</th><th className="p-3">Atrasadas</th><th className="p-3">Realizadas</th><th className="p-3">Realizadas no prazo</th><th className="p-3">Pendências</th></tr>
          </thead>
          <tbody>
            {linhas.map((r) => (
              <tr key={r.l.id} className="border-b last:border-0 align-top">
                <td className="p-3 font-medium">{r.l.nome}{r.l.cargo && <div className="text-xs text-muted-foreground">{r.l.cargo}</div>}</td>
                <td className="p-3">{r.previstas}</td>
                <td className="p-3">{r.atrasadas.length ? <Badge variant="destructive">{r.atrasadas.length}</Badge> : 0}</td>
                <td className="p-3">{r.concluidas}</td>
                <td className="p-3">{r.pct === null ? "—" : `${r.pct}%`}</td>
                <td className="p-3 text-xs">{r.atrasadas.map((e) => `${e.titulo} (${fmt(e.prazo)})`).join(" · ") || "—"}</td>
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

function LideradosTab({ liderados, entregas }: { liderados: Liderado[]; entregas: Entrega[] }) {
  const salvar = useSalvarLiderado();
  const excluir = useExcluirLiderado();
  const [edit, setEdit] = useState<Partial<Liderado> | null>(null);

  const onSalvar = async () => {
    if (!edit?.nome?.trim()) return toast.error("Informe o nome.");
    try {
      await salvar.mutateAsync({ id: edit.id, nome: edit.nome.trim(), cargo: edit.cargo || null, email: edit.email || null, ativo: edit.ativo ?? true });
      toast.success("Liderado salvo."); setEdit(null);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-3 mt-4">
      <Button onClick={() => setEdit({ ativo: true })}><Users className="h-4 w-4 mr-1.5" />Cadastrar liderado</Button>
      <div className="metasia-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b"><tr><th className="p-3">Nome</th><th className="p-3">Cargo</th><th className="p-3">E-mail</th><th className="p-3">Entregas</th><th className="p-3">Situação</th><th /></tr></thead>
          <tbody>
            {liderados.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{l.nome}</td><td className="p-3">{l.cargo || "—"}</td><td className="p-3">{l.email || "—"}</td>
                <td className="p-3">{entregas.filter((e) => e.liderado_cadastro_id === l.id).length}</td>
                <td className="p-3">{l.ativo ? "Ativo" : "Inativo"}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit(l)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => { if (confirm(`Excluir ${l.nome} e suas entregas?`)) excluir.mutate(l.id); }}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {!liderados.length && <tr><td className="p-4 text-muted-foreground" colSpan={6}>Nenhum liderado cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar liderado" : "Cadastrar liderado"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={edit?.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
            <div><Label>Cargo</Label><Input value={edit?.cargo ?? ""} onChange={(e) => setEdit({ ...edit, cargo: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input type="email" value={edit?.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
            <div><Label>Situação</Label>
              <Select value={edit?.ativo === false ? "inativo" : "ativo"} onValueChange={(v) => setEdit({ ...edit, ativo: v === "ativo" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={onSalvar} disabled={salvar.isPending}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NovaEntregaDialog({ open, onOpenChange, liderados }: { open: boolean; onOpenChange: (o: boolean) => void; liderados: Liderado[] }) {
  const create = useCreateEntrega();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [liderado, setLiderado] = useState("");
  const [prazo, setPrazo] = useState("");
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("unica");

  const salvar = async () => {
    if (!titulo || !liderado || !prazo) return toast.error("Preencha liderado, entrega e prazo.");
    try {
      await create.mutateAsync({ titulo, descricao: descricao || undefined, liderado_cadastro_id: liderado, prazo, periodicidade });
      toast.success("Entrega agendada.");
      setTitulo(""); setDescricao(""); setPrazo(""); setPeriodicidade("unica");
      onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova entrega</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Liderado *</Label>
            <Select value={liderado} onValueChange={setLiderado}>
              <SelectTrigger><SelectValue placeholder="Quem deve entregar" /></SelectTrigger>
              <SelectContent>{liderados.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Entrega *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Relatório de vendas" /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{periodicidade === "unica" ? "Prazo *" : "Primeiro prazo *"}</Label><Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
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

function DetalheEntrega({ entrega, onClose, nome }: { entrega: Entrega | null; onClose: () => void; nome: (id: string | null) => string }) {
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
                <div><span className="text-muted-foreground">Prazo:</span> {fmt(entrega.prazo)}</div>
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
                  <Button onClick={onRegistrar} disabled={registrar.isPending}><CheckCircle2 className="h-4 w-4 mr-1.5" />Marcar como entregue</Button>
                </div>
              )}

              <div>
                <Label>Alterar situação</Label>
                <Select value={entrega.status} onValueChange={(v) => mudarStatus(v as EntregaStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPCOES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>

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

              <Button variant="ghost" className="text-destructive" onClick={async () => { if (confirm("Excluir esta entrega?")) { await excluir.mutateAsync(entrega.id); fechar(); } }}>
                <Trash2 className="h-4 w-4 mr-1.5" />Excluir entrega
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

