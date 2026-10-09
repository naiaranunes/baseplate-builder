import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS, PERIODICIDADES, todayISO } from "@/lib/metas";
import { useColaboradoresResponsaveis, useCreateMeta } from "@/hooks/useMetas";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function NovaMetaModal({ open, onOpenChange }: Props) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState<string>(AREAS[0]);
  const [responsavelId, setResponsavelId] = useState<string>("__none__");
  const [valorAlvo, setValorAlvo] = useState<string>("");
  const [unidade, setUnidade] = useState("R$");
  const [periodicidade, setPeriodicidade] = useState<string>("mensal");
  const [dataInicio, setDataInicio] = useState<string>(todayISO());
  const [dataFim, setDataFim] = useState<string>("");
  const [isInverse, setIsInverse] = useState(false);

  const {
    data: colaboradores = [],
    isLoading: colaboradoresLoading,
    isError: colaboradoresError,
    error: colaboradoresQueryError,
  } = useColaboradoresResponsaveis(open);
  const createMeta = useCreateMeta();

  const reset = () => {
    setNome("");
    setDescricao("");
    setArea(AREAS[0]);
    setResponsavelId("__none__");
    setValorAlvo("");
    setUnidade("R$");
    setPeriodicidade("mensal");
    setDataInicio(todayISO());
    setDataFim("");
    setIsInverse(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const valor = Number(valorAlvo.replace(",", "."));
    if (!nome.trim()) return toast.error("Informe o nome da entrega.");
    if (!area) return toast.error("Selecione uma área.");
    if (!unidade.trim()) return toast.error("Informe a unidade (R$, %, leads, etc).");
    if (!dataInicio || !dataFim) return toast.error("Defina datas de início e fim.");
    if (dataFim < dataInicio) return toast.error("Data fim precisa ser após início.");

    const responsavel = colaboradores.find(
      (colaborador) => colaborador.id === responsavelId && colaborador.ativo,
    );
    if (responsavelId !== "__none__" && !responsavel) {
      return toast.error("Selecione um colaborador ativo com conta vinculada.");
    }

    try {
      await createMeta.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        area,
        responsavel_id: responsavel?.id ?? null,
        valor_alvo: valor,
        valor_atual: 0,
        unidade: unidade.trim(),
        periodicidade: periodicidade as "mensal" | "trimestral" | "anual",
        data_inicio: dataInicio,
        data_fim: dataFim,
        is_inverse: isInverse,
      });
      toast.success("Entrega criada com sucesso");
      reset();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar entrega";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova entrega</DialogTitle>
          <DialogDescription>
            Defina o alvo, a janela e o responsável. O status será calculado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome da entrega *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Receita MRR Maio"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Área *</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {colaboradoresLoading && (
                    <SelectItem value="__loading__" disabled>Carregando colaboradores…</SelectItem>
                  )}
                  {colaboradoresError && (
                    <SelectItem value="__error__" disabled>Não foi possível carregar colaboradores.</SelectItem>
                  )}
                  {!colaboradoresLoading && !colaboradoresError && colaboradores.length === 0 && (
                    <SelectItem value="__empty__" disabled>Nenhum colaborador cadastrado.</SelectItem>
                  )}
                  {colaboradores.map((colaborador) => {
                    const value = colaborador.id ?? `sem-conta:${colaborador.cadastroId}`;
                    return (
                      <SelectItem
                        key={colaborador.cadastroId}
                        value={value}
                        disabled={!colaborador.id || !colaborador.ativo}
                      >
                        {colaborador.full_name}
                        {!colaborador.ativo
                          ? " — inativo"
                          : !colaborador.id
                            ? " — conta não vinculada"
                            : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {colaboradoresError && (
                <p role="alert" className="text-xs text-destructive">
                  Não foi possível carregar os colaboradores: {colaboradoresQueryError.message}
                </p>
              )}
            </div>
          </div>

         

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Periodicidade *</Label>
              <Select value={periodicidade} onValueChange={setPeriodicidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICIDADES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inicio">Início *</Label>
              <Input
                id="inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fim">Fim *</Label>
              <Input
                id="fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </div>
          </div>


          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição (opcional)</Label>
            <Textarea
              id="desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Contexto, fórmula de cálculo, fonte de dados…"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMeta.isPending}
              style={{ backgroundColor: "var(--color-blue)", color: "white" }}
              className="hover:opacity-90"
            >
              {createMeta.isPending ? "Criando…" : "Criar entrega"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
