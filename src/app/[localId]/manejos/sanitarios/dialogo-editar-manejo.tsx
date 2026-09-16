"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { atualizarManejoSanitario } from "@/lib/actions/manejos-sanitarios";
import { CampoMedicamentos } from "./campo-medicamentos";
import { SeletorAnimaisManejo } from "./seletor-animais-manejo";
import type { AnimalManejo, GrupoManejo, OpcaoArea, OpcaoMedicamento } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

export function DialogoEditarManejo({
  localId,
  grupo,
  animais,
  areas,
  medicamentos,
  onFechar,
}: {
  localId: string;
  grupo: GrupoManejo | null;
  animais: AnimalManejo[];
  areas: OpcaoArea[];
  medicamentos: OpcaoMedicamento[];
  onFechar: () => void;
}) {
  return (
    <Dialog open={grupo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar manejo sanitário</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent: remontar o Popup no
            meio da própria transição de fechamento fazia a janela "voltar"
            — reabrir sozinha assim que o usuário salvava ou trocava de
            manejo. */}
        {grupo && (
          <ConteudoEditarManejo
            key={grupo.id}
            localId={localId}
            grupo={grupo}
            animais={animais}
            areas={areas}
            medicamentos={medicamentos}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoEditarManejo({
  localId,
  grupo,
  animais,
  areas,
  medicamentos,
  onFechar,
}: {
  localId: string;
  grupo: GrupoManejo;
  animais: AnimalManejo[];
  areas: OpcaoArea[];
  medicamentos: OpcaoMedicamento[];
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(atualizarManejoSanitario, undefined);
  const [areaId, setAreaId] = useState(grupo.area_id);
  const [data, setData] = useState(grupo.data);
  const [responsavel, setResponsavel] = useState(grupo.responsavel ?? "");
  const [descricao, setDescricao] = useState(grupo.descricao ?? "");
  const [observacoes, setObservacoes] = useState(grupo.observacoes ?? "");
  const [animalIds, setAnimalIds] = useState<Set<string>>(new Set(grupo.animais.map((a) => a.id)));
  const [medicamentoIds, setMedicamentoIds] = useState<Set<string>>(new Set(grupo.medicamentoIds));
  const [medicamentosLocais, setMedicamentosLocais] = useState(medicamentos);
  const [seletorAberto, setSeletorAberto] = useState(false);

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success("Manejo sanitário atualizado.");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <>
      <form action={acao} className="flex flex-col gap-4">
        <input type="hidden" name="localId" value={localId} />
        <input type="hidden" name="manejoId" value={grupo.id} />
        <input type="hidden" name="animalIds" value={JSON.stringify(Array.from(animalIds))} />
        <input type="hidden" name="medicamentoIds" value={JSON.stringify(Array.from(medicamentoIds))} />
        <input type="hidden" name="areaId" value={areaId} />

        <div className="flex flex-col gap-2">
          <Label>Animais</Label>
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => setSeletorAberto(true)}
          >
            <Users className="size-4" />
            {animalIds.size} animal(is) selecionado(s)
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="areaEditarManejo">Área</Label>
          <Select
            value={areaId}
            onValueChange={(v) => setAreaId(v ?? "")}
            items={areas.map((a) => ({ value: a.id, label: a.nome }))}
          >
            <SelectTrigger id="areaEditarManejo" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Medicamentos</Label>
          <CampoMedicamentos
            localId={localId}
            medicamentos={medicamentosLocais}
            selecionados={medicamentoIds}
            onChange={setMedicamentoIds}
            onCriado={(m) => setMedicamentosLocais((atual) => [...atual, m])}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dataEditarManejo">Data</Label>
          <Input
            id="dataEditarManejo"
            name="data"
            type="date"
            max={hojeISO}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="responsavelEditarManejo">Responsável</Label>
          <Input
            id="responsavelEditarManejo"
            name="responsavel"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="descricaoEditarManejo">Descrição</Label>
          <Input
            id="descricaoEditarManejo"
            name="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="observacoesEditarManejo">Observações</Label>
          <Textarea
            id="observacoesEditarManejo"
            name="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>
        {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
        <DialogFooter>
          <Button type="submit" disabled={emAndamento || animalIds.size === 0 || !areaId}>
            {emAndamento ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>

      <SeletorAnimaisManejo
        aberto={seletorAberto}
        especie={grupo.especie}
        animais={animais}
        selecionadosIniciais={animalIds}
        onFechar={() => setSeletorAberto(false)}
        onConfirmar={(novos) => {
          setAnimalIds(novos);
          setSeletorAberto(false);
        }}
      />
    </>
  );
}
