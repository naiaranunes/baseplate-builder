import { useMemo, useState } from "react";
import { PackageCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  type Entrega, useAddComentario, useCreateEntrega, useEntregas, useHistorico, useMembros, useUpdateStatus,
} from "@/hooks/useEntregas";
import { STATUS_LABEL, STATUS_OPCOES, type EntregaStatus, type StatusExibido, statusExibido } from "@/lib/entregas";

const STATUS_VARIANT: Record<StatusExibido, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "outline", em_andamento: "secondary", entregue: "default", aprovada: "default", devolvida: "destructive", atrasada: "destructive",
};

const fmt = (d: string) => new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR");

export default function EntregasPage() {
  const { data: entregas, isLoading } = useEntregas();
  const { data: membros } = useMembros();
  const [novoOpen, setNovoOpen] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | StatusExibido>("todos");
  const [selecionada, setSelecionada] = useState<Entrega | null>(null);
  const nome = useMemo(() => {
    const m = new Map((membros ?? []).map((x) => [x.id, x.full_name]));
    return (id?: string | null) => (id && m.get(id)) || "—";
  }, [membros]);

  const lista = (entregas ?? []).filter((e) => filtro === "todos" || statusExibido(e.status, e.prazo) === filtro);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Entregas</h1>
            <p className="text-sm text-muted-foreground">Líder → Liderado → Entrega → Prazo → Status → Histórico</p>
          </div>
          <div className="flex gap-2">
            <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {(Object.keys(STATUS_LABEL) as StatusExibido[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setNovoOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Nova entrega</Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : lista.length === 0 ? (
          <div className="metasia-card p-12 flex flex-col items-center text-center space-y-3">
            <PackageCheck className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Nenhuma entrega encontrada</h2>
            <p className="text-sm text-muted-foreground">Cadastre uma entrega definindo líder, liderado e prazo.</p>
          </div>
        ) : (
          <div className="metasia-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="p-3">Líder</th><th className="p-3">Liderado</th><th className="p-3">Entrega</th>
                  <th className="p-3">Prazo</th><th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => {
                  const s = statusExibido(e.status, e.prazo);
                  return (
                    <tr key={e.id} className="border-b last:border-0 cursor-pointer hover:bg-muted/50" onClick={() => setSelecionada(e)}>
                      <td className="p-3">{nome(e.lider_id)}</td>
                      <td className="p-3">{nome(e.liderado_id)}</td>
                      <td className="p-3 font-medium">{e.titulo}</td>
                      <td className="p-3">{fmt(e.prazo)}</td>
                      <td className="p-3"><Badge variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NovaEntregaDialog open={novoOpen} onOpenChange={setNovoOpen} membros={membros ?? []} />
      <DetalheEntrega entrega={selecionada} onClose={() => setSelecionada(null)} nome={nome} />
    </AppShell>
  );
}

function NovaEntregaDialog({ open, onOpenChange, membros }: { open: boolean; onOpenChange: (o: boolean) => void; membros: { id: string; full_name: string }[] }) {
  const { user } = useAuth();
  const create = useCreateEntrega();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [lider, setLider] = useState("");
  const [liderado, setLiderado] = useState("");
  const [prazo, setPrazo] = useState("");

  const salvar = async () => {
    const lider_id = lider || user?.id || "";
    if (!titulo || !lider_id || !liderado || !prazo) return toast.error("Preencha todos os campos obrigatórios.");
    try {
      await create.mutateAsync({ titulo, descricao: descricao || undefined, lider_id, liderado_id: liderado, prazo });
      toast.success("Entrega cadastrada.");
      setTitulo(""); setDescricao(""); setLiderado(""); setPrazo("");
      onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  const MembroSelect = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{membros.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova entrega</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Líder</Label><MembroSelect value={lider || user?.id || ""} onChange={setLider} placeholder="Líder" /></div>
            <div><Label>Liderado *</Label><MembroSelect value={liderado} onChange={setLiderado} placeholder="Liderado" /></div>
          </div>
          <div><Label>Entrega *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que deve ser entregue" /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <div><Label>Prazo *</Label><Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={salvar} disabled={create.isPending}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetalheEntrega({ entrega, onClose, nome }: { entrega: Entrega | null; onClose: () => void; nome: (id?: string | null) => string }) {
  const { user } = useAuth();
  const { data: historico } = useHistorico(entrega?.id);
  const update = useUpdateStatus();
  const comentar = useAddComentario();
  const [comentario, setComentario] = useState("");
  const [status, setStatus] = useState<EntregaStatus | null>(null);
  const atual = status ?? entrega?.status;

  const mudarStatus = async (s: EntregaStatus) => {
    if (!entrega) return;
    try { await update.mutateAsync({ id: entrega.id, status: s }); setStatus(s); toast.success("Status atualizado."); }
    catch (e) { toast.error((e as Error).message); }
  };
  const enviar = async () => {
    if (!entrega || !user || !comentario.trim()) return;
    try { await comentar.mutateAsync({ entrega_id: entrega.id, comentario: comentario.trim(), autor_id: user.id }); setComentario(""); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Sheet open={!!entrega} onOpenChange={(o) => { if (!o) { onClose(); setStatus(null); } }}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {entrega && (
          <>
            <SheetHeader><SheetTitle>{entrega.titulo}</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4 text-sm">
              {entrega.descricao && <p className="text-muted-foreground">{entrega.descricao}</p>}
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Líder:</span> {nome(entrega.lider_id)}</div>
                <div><span className="text-muted-foreground">Liderado:</span> {nome(entrega.liderado_id)}</div>
                <div><span className="text-muted-foreground">Prazo:</span> {fmt(entrega.prazo)}</div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={atual} onValueChange={(v) => mudarStatus(v as EntregaStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPCOES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Adicionar comentário</Label>
                <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} />
                <Button size="sm" onClick={enviar} disabled={comentar.isPending}>Registrar</Button>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Histórico</h3>
                <ul className="space-y-2">
                  {(historico ?? []).map((h) => (
                    <li key={h.id} className="border-l-2 pl-3">
                      <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")} · {nome(h.autor_id)}</div>
                      {h.status_novo && (
                        <div>{h.status_anterior ? `${STATUS_LABEL[h.status_anterior as EntregaStatus] ?? h.status_anterior} → ` : ""}{STATUS_LABEL[h.status_novo as EntregaStatus] ?? h.status_novo}</div>
                      )}
                      {h.comentario && <div>{h.comentario}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
