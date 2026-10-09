import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useEntregas, useLiderados, useRegistrarRealizacao } from "@/hooks/useEntregas";
import { fmtPrazo, hojeISO, isConcluida } from "@/lib/entregas";

export function LancarEntregaModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: entregas } = useEntregas();
  const { data: liderados } = useLiderados();
  const { user, isAdmin, isSupervisor } = useAuth();
  const registrar = useRegistrarRealizacao();
  const [id, setId] = useState("");
  const [data, setData] = useState(hojeISO());
  const [obs, setObs] = useState("");

  const isLider = isAdmin || isSupervisor;
  const mail = (user?.email ?? "").toLowerCase();
  const meus = new Set((liderados ?? []).filter((l) => (l.email ?? "").toLowerCase() === mail).map((l) => l.id));
  const nome = new Map((liderados ?? []).map((l) => [l.id, l.nome]));
  const abertas = (entregas ?? [])
    .filter((e) => !isConcluida(e.status))
    .filter((e) => isLider || (e.liderado_cadastro_id && meus.has(e.liderado_cadastro_id)))
    .sort((a, b) => a.prazo.localeCompare(b.prazo));

  const salvar = async () => {
    const entrega = abertas.find((e) => e.id === id);
    if (!entrega) return toast.error("Selecione a entrega.");
    try {
      const prox = await registrar.mutateAsync({ entrega, data, observacao: obs });
      toast.success(prox ? "Entrega registrada. Próxima já agendada." : "Entrega registrada.");
      setId(""); setObs(""); setData(hojeISO());
      onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Lançar entrega</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Entrega *</Label>
            <Select value={id} onValueChange={setId}>
              <SelectTrigger><SelectValue placeholder={abertas.length ? "Selecione a entrega" : "Nenhuma entrega pendente"} /></SelectTrigger>
              <SelectContent>
                {abertas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.titulo} — {fmtPrazo(e.prazo, e.prazo_hora)}{isLider && e.liderado_cadastro_id ? ` · ${nome.get(e.liderado_cadastro_id) ?? ""}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Data da entrega</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label>Observação</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={salvar} disabled={registrar.isPending || !id}>Marcar como entregue</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
