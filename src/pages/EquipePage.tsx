import { useMemo, useState } from "react";
import { Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamSettings from "@/components/settings/TeamSettings";
import { useAuth } from "@/hooks/useAuth";
import { useExcluirLiderado, useLideres, useLiderados, useSalvarLiderado, type Liderado } from "@/hooks/useEntregas";

const AREAS_SUGERIDAS = ["Diretoria Comercial e Operações", "Obras", "Comercial/Vendas", "Administrativo", "Marketing", "Produção"];

type Form = { id?: string; nome: string; cargo: string; area: string; gestor_id: string; ativo: boolean };

export default function EquipePage() {
  const { user, isAdmin } = useAuth();
  const { data: liderados, isLoading } = useLiderados();
  const { data: lideres } = useLideres();
  const salvar = useSalvarLiderado();
  const excluir = useExcluirLiderado();

  const [busca, setBusca] = useState("");
  const [fArea, setFArea] = useState("todas");
  const [fLider, setFLider] = useState("todos");
  const [fStatus, setFStatus] = useState("ativo");
  const [form, setForm] = useState<Form | null>(null);
  const [detalhe, setDetalhe] = useState<Liderado | null>(null);

  const nomeLider = useMemo(() => {
    const m = new Map((lideres ?? []).map((l) => [l.id, l.full_name]));
    return (id: string) => m.get(id) ?? (id === user?.id ? "Você" : "—");
  }, [lideres, user]);

  // Líder comum só pode atribuir a si mesmo; admin escolhe qualquer líder.
  const opcoesLider = isAdmin ? lideres ?? [] : (lideres ?? []).filter((l) => l.id === user?.id);
  const areas = Array.from(new Set([...AREAS_SUGERIDAS, ...(liderados ?? []).map((l) => l.area).filter(Boolean) as string[]]));

  const lista = (liderados ?? []).filter((l) =>
    l.nome.toLowerCase().includes(busca.toLowerCase()) &&
    (fArea === "todas" || l.area === fArea) &&
    (fLider === "todos" || l.gestor_id === fLider) &&
    (fStatus === "todos" || (fStatus === "ativo" ? l.ativo : !l.ativo)),
  );

  const abrirNovo = () => setForm({ nome: "", cargo: "", area: "", gestor_id: user?.id ?? "", ativo: true });
  const abrirEdicao = (l: Liderado) => setForm({ id: l.id, nome: l.nome, cargo: l.cargo ?? "", area: l.area ?? "", gestor_id: l.gestor_id, ativo: l.ativo });

  const enviar = async () => {
    if (!form) return;
    if (!form.nome.trim()) return toast.error("Informe o nome completo.");
    if (!form.gestor_id) return toast.error("Selecione o líder responsável.");
    try {
      await salvar.mutateAsync({ id: form.id, nome: form.nome.trim(), cargo: form.cargo || null, area: form.area || null, gestor_id: form.gestor_id, ativo: form.ativo });
      toast.success(form.id ? "Liderado atualizado." : "Liderado cadastrado.");
      setForm(null);
    } catch (e) { toast.error((e as Error).message); }
  };

  const alternarStatus = async (l: Liderado) => {
    try {
      await salvar.mutateAsync({ id: l.id, nome: l.nome, ativo: !l.ativo });
      toast.success(l.ativo ? "Liderado inativado." : "Liderado reativado.");
    } catch (e) { toast.error((e as Error).message); }
  };

  const remover = async (l: Liderado) => {
    if (!confirm(`Remover ${l.nome}? Se houver entregas registradas, ele será apenas inativado.`)) return;
    try {
      const r = await excluir.mutateAsync(l.id);
      toast.success(r === "inativado" ? "Possui histórico: foi inativado em vez de excluído." : "Liderado excluído.");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Equipe</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Você vê toda a estrutura da organização." : "Você vê apenas os seus liderados."}
            </p>
          </div>
          <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-1.5" />Novo liderado</Button>
        </div>

        <Tabs defaultValue="liderados">
          {isAdmin && (
            <TabsList>
              <TabsTrigger value="liderados">Liderados</TabsTrigger>
              <TabsTrigger value="lideres">Líderes</TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="liderados" className="space-y-5 mt-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={fArea} onValueChange={setFArea}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as áreas</SelectItem>
              {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={fLider} onValueChange={setFLider}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os líderes</SelectItem>
                {(lideres ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card">
          {isLoading ? <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead><TableHead>Cargo/Função</TableHead><TableHead>Área</TableHead>
                  <TableHead>Líder responsável</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum liderado encontrado.</TableCell></TableRow>}
                {lista.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetalhe(l)}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell>{l.cargo ?? "—"}</TableCell>
                    <TableCell>{l.area ?? "—"}</TableCell>
                    <TableCell>{nomeLider(l.gestor_id)}</TableCell>
                    <TableCell><Badge variant={l.ativo ? "default" : "secondary"}>{l.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => abrirEdicao(l)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title={l.ativo ? "Inativar" : "Reativar"} onClick={() => alternarStatus(l)}><Power className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Remover" onClick={() => remover(l)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
          </TabsContent>
          {isAdmin && (
            <TabsContent value="lideres" className="mt-4">
              <TeamSettings />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Editar liderado" : "Novo liderado"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label>Nome completo</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value }) }/></div>
              <div><Label>Cargo/Função</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
              <div>

                <Label>Área/Departamento</Label>
                <Input list="areas-sugeridas" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex.: Comercial/Vendas" />
                <datalist id="areas-sugeridas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
              </div>
              <div>
                <Label>Líder responsável</Label>
                <Select value={form.gestor_id} onValueChange={(v) => setForm({ ...form, gestor_id: v })} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {opcoesLider.length === 0 && user && <SelectItem value={user.id}>Você</SelectItem>}
                    {opcoesLider.map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!isAdmin && <p className="text-xs text-muted-foreground mt-1">Somente administradores podem transferir para outro líder.</p>}
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.ativo ? "ativo" : "inativo"} onValueChange={(v) => setForm({ ...form, ativo: v === "ativo" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={enviar} disabled={salvar.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <SheetContent className="overflow-y-auto">
          {detalhe && (
            <>
              <SheetHeader><SheetTitle>{detalhe.nome}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-5">
                <section>
                  <h3 className="text-sm font-semibold mb-2">Informações</h3>
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Cargo/Função</dt><dd>{detalhe.cargo ?? "—"}</dd>
                    <dt className="text-muted-foreground">Área</dt><dd>{detalhe.area ?? "—"}</dd>
                    <dt className="text-muted-foreground">Líder responsável</dt><dd>{nomeLider(detalhe.gestor_id)}</dd>
                    <dt className="text-muted-foreground">Status</dt><dd>{detalhe.ativo ? "Ativo" : "Inativo"}</dd>
                  </dl>
                </section>
                {["Entregas", "Prazos", "Histórico", "Desempenho"].map((s) => (
                  <section key={s} className="rounded-md border border-dashed p-3">
                    <h3 className="text-sm font-semibold">{s}</h3>
                    <p className="text-xs text-muted-foreground">Disponível em breve.</p>
                  </section>
                ))}
                <Button variant="outline" className="w-full" onClick={() => { abrirEdicao(detalhe); setDetalhe(null); }}>
                  <Pencil className="h-4 w-4 mr-1.5" />Editar
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
