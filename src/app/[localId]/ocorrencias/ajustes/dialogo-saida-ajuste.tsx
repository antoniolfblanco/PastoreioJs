"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { registrarSaidaAjuste } from "@/lib/actions/ajustes";
import { SeletorAnimaisAjuste } from "./seletor-animais-ajuste";
import type { AnimalAtivo } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null }) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type Props = {
  localId: string;
  aberto: boolean;
  animaisAtivos: AnimalAtivo[];
  onFechar: () => void;
};

export function DialogoSaidaAjuste({ localId, aberto, animaisAtivos, onFechar }: Props) {
  const [resultado, acao, emAndamento] = useActionState(registrarSaidaAjuste, undefined);

  const [animalIds, setAnimalIds] = useState<Set<string>>(new Set());
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [valorAtual, setValorAtual] = useState("");

  const animaisSelecionados = animaisAtivos.filter((a) => animalIds.has(a.id));

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success("Saída de acerto registrada.");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <>
      <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar saída de acerto de contagem</DialogTitle>
          </DialogHeader>
          {aberto && (
            <form action={acao} className="flex flex-col gap-4">
              <input type="hidden" name="localId" value={localId} />
              <input type="hidden" name="animalIds" value={JSON.stringify(Array.from(animalIds))} />
              <p className="text-sm text-muted-foreground">
                Use quando um animal cadastrado como ativo não é encontrado na contagem física (erro de
                contagem anterior, não confundir com furto ou morte).
              </p>

              <div className="flex flex-col gap-2">
                <Label>Animais</Label>
                <Button type="button" variant="outline" className="justify-start" onClick={() => setSeletorAberto(true)}>
                  {animalIds.size === 0 ? "Selecionar animais..." : `${animalIds.size} animal(is) selecionado(s)`}
                </Button>
                {animaisSelecionados.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {animaisSelecionados.map((a) => identificacao(a)).join(", ")}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="dataAjusteSaida">Data</Label>
                <Input
                  id="dataAjusteSaida"
                  name="data"
                  type="date"
                  max={hojeISO}
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="responsavelAjusteSaida">Responsável</Label>
                <Input
                  id="responsavelAjusteSaida"
                  name="responsavel"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="descricaoAjusteSaida">Descrição</Label>
                <Input
                  id="descricaoAjusteSaida"
                  name="descricao"
                  placeholder="Ex.: Falta na conferência do piquete 3"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="observacoesAjusteSaida">Observações</Label>
                <Textarea
                  id="observacoesAjusteSaida"
                  name="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="valorAtualAjusteSaida">Valor de baixa (R$, opcional)</Label>
                <CampoValorReais value={valorAtual} onChange={setValorAtual} className="max-w-40" />
                <input type="hidden" name="valorAtual" value={valorAtual} />
              </div>

              {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
              <DialogFooter>
                <Button type="submit" disabled={emAndamento || animalIds.size === 0}>
                  {emAndamento ? "Registrando..." : "Registrar saída"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <SeletorAnimaisAjuste
        aberto={seletorAberto}
        animais={animaisAtivos}
        selecionados={animalIds}
        onConfirmar={setAnimalIds}
        onFechar={() => setSeletorAberto(false)}
      />
    </>
  );
}
