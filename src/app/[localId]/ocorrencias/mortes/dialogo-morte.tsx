"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { atualizarMorte } from "@/lib/actions/mortes";
import { CampoEnfermidade } from "./campo-enfermidade";
import type { GrupoMorte, OpcaoEnfermidade } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null }) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type Props = {
  localId: string;
  grupo: GrupoMorte | null;
  enfermidades: OpcaoEnfermidade[];
  onFechar: () => void;
};

// Edição de um registro de morte já feito — o registro novo é feito pela
// tela de três cards (NovaMorte).
export function DialogoMorte({ localId, grupo, enfermidades, onFechar }: Props) {
  const [resultado, acao, emAndamento] = useActionState(atualizarMorte, undefined);

  const [enfermidadesLocais, setEnfermidadesLocais] = useState(enfermidades);
  const [data, setData] = useState(grupo?.data ?? hojeISO);
  const [enfermidadeId, setEnfermidadeId] = useState(grupo?.enfermidade_id ?? "");
  const [tratada, setTratada] = useState(grupo?.tratada ?? false);
  const [responsavel, setResponsavel] = useState(grupo?.responsavel ?? "");
  const [descricao, setDescricao] = useState(grupo?.descricao ?? "");
  const [observacoes, setObservacoes] = useState(grupo?.observacoes ?? "");

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success("Registro atualizado.");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={grupo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar registro de morte</DialogTitle>
        </DialogHeader>
        {grupo && (
          <form action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <input type="hidden" name="grupoId" value={grupo.ocorrencia_grupo_id} />

            <div className="flex flex-col gap-2">
              <Label>Animais</Label>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                {grupo.animais.map((a) => identificacao(a)).join(", ")}
                <p className="mt-1 text-xs">Os animais de um registro já feito não podem ser alterados aqui.</p>
              </div>
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

            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
