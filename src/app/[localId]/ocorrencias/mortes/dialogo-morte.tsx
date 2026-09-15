"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { registrarMorte, atualizarMorte } from "@/lib/actions/mortes";
import { CampoEnfermidade } from "./campo-enfermidade";
import { SeletorAnimaisMorte } from "./seletor-animais-morte";
import type { AnimalAtivo, GrupoMorte, OpcaoEnfermidade } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null }) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type Props = {
  localId: string;
  grupo: GrupoMorte | "novo" | null;
  animaisAtivos: AnimalAtivo[];
  enfermidades: OpcaoEnfermidade[];
  onFechar: () => void;
};

export function DialogoMorte({ localId, grupo, animaisAtivos, enfermidades, onFechar }: Props) {
  const existente = grupo && grupo !== "novo" ? grupo : null;
  const acaoMorte = existente ? atualizarMorte : registrarMorte;
  const [resultado, acao, emAndamento] = useActionState(acaoMorte, undefined);

  const [enfermidadesLocais, setEnfermidadesLocais] = useState(enfermidades);
  const [animalIds, setAnimalIds] = useState<Set<string>>(new Set());
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [data, setData] = useState(existente?.data ?? hojeISO);
  const [enfermidadeId, setEnfermidadeId] = useState(existente?.enfermidade_id ?? "");
  const [tratada, setTratada] = useState(existente?.tratada ?? false);
  const [responsavel, setResponsavel] = useState(existente?.responsavel ?? "");
  const [descricao, setDescricao] = useState(existente?.descricao ?? "");
  const [observacoes, setObservacoes] = useState(existente?.observacoes ?? "");
  const [valorAtual, setValorAtual] = useState("");

  const animaisSelecionados = animaisAtivos.filter((a) => animalIds.has(a.id));

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success(existente ? "Registro atualizado." : "Morte registrada.");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <>
      <Dialog open={grupo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{existente ? "Editar registro de morte" : "Registrar morte"}</DialogTitle>
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
                  <Label htmlFor="dataMorte">Data</Label>
                  <Input
                    id="dataMorte"
                    name="data"
                    type="date"
                    max={hojeISO}
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Checkbox id="tratadaMorte" name="tratada" checked={tratada} onCheckedChange={(v) => setTratada(v === true)} />
                  <Label htmlFor="tratadaMorte">Estava em tratamento</Label>
                </div>
              </div>

              <CampoEnfermidade
                htmlId="enfermidadeMorte"
                value={enfermidadeId}
                onValueChange={setEnfermidadeId}
                enfermidades={enfermidadesLocais}
                localId={localId}
                onCriada={(e) => setEnfermidadesLocais((atual) => [...atual, e])}
              />

              <div className="flex flex-col gap-2">
                <Label htmlFor="responsavelMorte">Responsável</Label>
                <Input
                  id="responsavelMorte"
                  name="responsavel"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="descricaoMorte">Descrição</Label>
                <Input
                  id="descricaoMorte"
                  name="descricao"
                  placeholder="Ex.: Perda no piquete 3 após chuva forte"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="observacoesMorte">Observações</Label>
                <Textarea
                  id="observacoesMorte"
                  name="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              {!existente && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="valorAtualMorte">Valor de baixa (R$, opcional)</Label>
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
        <SeletorAnimaisMorte
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
