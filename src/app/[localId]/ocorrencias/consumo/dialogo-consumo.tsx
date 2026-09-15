"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { registrarConsumo, atualizarConsumo } from "@/lib/actions/consumo";
import { SeletorAnimaisConsumo } from "./seletor-animais-consumo";
import type { AnimalAtivo, GrupoConsumo } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null }) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type Props = {
  localId: string;
  grupo: GrupoConsumo | "novo" | null;
  animaisAtivos: AnimalAtivo[];
  onFechar: () => void;
};

export function DialogoConsumo({ localId, grupo, animaisAtivos, onFechar }: Props) {
  const existente = grupo && grupo !== "novo" ? grupo : null;
  const acaoConsumo = existente ? atualizarConsumo : registrarConsumo;
  const [resultado, acao, emAndamento] = useActionState(acaoConsumo, undefined);

  const [animalIds, setAnimalIds] = useState<Set<string>>(new Set());
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [data, setData] = useState(existente?.data ?? hojeISO);
  const [pesoVivo, setPesoVivo] = useState(existente?.peso_vivo != null ? String(existente.peso_vivo) : "");
  const [pesoCarne, setPesoCarne] = useState(existente?.peso_carne != null ? String(existente.peso_carne) : "");
  const [destino, setDestino] = useState(existente?.destino ?? "");
  const [responsavel, setResponsavel] = useState(existente?.responsavel ?? "");
  const [descricao, setDescricao] = useState(existente?.descricao ?? "");
  const [observacoes, setObservacoes] = useState(existente?.observacoes ?? "");
  const [valorAtual, setValorAtual] = useState("");

  const animaisSelecionados = animaisAtivos.filter((a) => animalIds.has(a.id));

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success(existente ? "Registro atualizado." : "Consumo registrado.");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <>
      <Dialog open={grupo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{existente ? "Editar registro de consumo" : "Registrar consumo"}</DialogTitle>
          </DialogHeader>
          {grupo && (
            <form action={acao} className="flex flex-col gap-4">
              <input type="hidden" name="localId" value={localId} />
              {existente && <input type="hidden" name="grupoId" value={existente.ocorrencia_grupo_id} />}
              {!existente && <input type="hidden" name="animalIds" value={JSON.stringify(Array.from(animalIds))} />}

              <div className="flex flex-col gap-2">
                <Label>Animais</Label>
                {existente ? (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    {existente.animais.map((a) => identificacao(a)).join(", ")}
                    <p className="mt-1 text-xs">
                      Os animais de um registro já feito não podem ser alterados aqui.
                    </p>
                  </div>
                ) : (
                  <>
                    <Button type="button" variant="outline" className="justify-start" onClick={() => setSeletorAberto(true)}>
                      {animalIds.size === 0
                        ? "Selecionar animais..."
                        : `${animalIds.size} animal(is) selecionado(s)`}
                    </Button>
                    {animaisSelecionados.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {animaisSelecionados.map((a) => identificacao(a)).join(", ")}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dataConsumo">Data</Label>
                  <Input
                    id="dataConsumo"
                    name="data"
                    type="date"
                    max={hojeISO}
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="destinoConsumo">Destino</Label>
                  <Input
                    id="destinoConsumo"
                    name="destino"
                    placeholder="Ex.: Consumo próprio"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pesoVivoConsumo">Peso vivo total (kg)</Label>
                  <Input
                    id="pesoVivoConsumo"
                    name="pesoVivo"
                    type="number"
                    step="0.01"
                    value={pesoVivo}
                    onChange={(e) => setPesoVivo(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pesoCarneConsumo">Peso de carne total (kg)</Label>
                  <Input
                    id="pesoCarneConsumo"
                    name="pesoCarne"
                    type="number"
                    step="0.01"
                    value={pesoCarne}
                    onChange={(e) => setPesoCarne(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="responsavelConsumo">Responsável</Label>
                <Input
                  id="responsavelConsumo"
                  name="responsavel"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="descricaoConsumo">Descrição</Label>
                <Input
                  id="descricaoConsumo"
                  name="descricao"
                  placeholder="Ex.: Abate pra churrasco da equipe"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="observacoesConsumo">Observações</Label>
                <Textarea
                  id="observacoesConsumo"
                  name="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              {!existente && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="valorAtualConsumo">Valor de baixa (R$, opcional)</Label>
                  <CampoValorReais value={valorAtual} onChange={setValorAtual} className="max-w-40" />
                  <input type="hidden" name="valorAtual" value={valorAtual} />
                </div>
              )}

              {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
              <DialogFooter>
                <Button type="submit" disabled={emAndamento || (!existente && animalIds.size === 0)}>
                  {emAndamento ? "Salvando..." : existente ? "Salvar" : "Registrar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {!existente && (
        <SeletorAnimaisConsumo
          aberto={seletorAberto}
          animais={animaisAtivos}
          selecionados={animalIds}
          onConfirmar={setAnimalIds}
          onFechar={() => setSeletorAberto(false)}
        />
      )}
    </>
  );
}
