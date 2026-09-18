"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { atualizarLoteEmbrioes } from "@/lib/actions/banco-genetico";
import { CampoAnimalGenetico } from "./campo-animal-genetico";
import type { CandidatoGenetico, LoteEmbriao } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

export function DialogoEditarLoteEmbrioes({
  localId,
  candidatos,
  lote,
  onFechar,
}: {
  localId: string;
  candidatos: CandidatoGenetico[];
  lote: LoteEmbriao | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={lote !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar lote de embriões</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent — mesmo motivo já
            documentado nos outros diálogos do Banco Genético. */}
        {lote && (
          <ConteudoEditarLoteEmbrioes
            key={lote.id}
            localId={localId}
            candidatos={candidatos}
            lote={lote}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoEditarLoteEmbrioes({
  localId,
  candidatos,
  lote,
  onFechar,
}: {
  localId: string;
  candidatos: CandidatoGenetico[];
  lote: LoteEmbriao;
  onFechar: () => void;
}) {
  const [doadoraId, setDoadoraId] = useState(lote.doadora_id);
  const [touroId, setTouroId] = useState(lote.touro_id);
  const [quantidade, setQuantidade] = useState(String(lote.quantidade));
  const [dataProducao, setDataProducao] = useState(lote.data_producao ?? "");
  const [observacoes, setObservacoes] = useState(lote.observacoes ?? "");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function confirmar() {
    const qtd = Number(quantidade);
    if (!doadoraId) {
      setErro("Selecione a doadora.");
      return;
    }
    if (!touroId) {
      setErro("Selecione o touro.");
      return;
    }
    if (!Number.isInteger(qtd) || qtd < 0) {
      setErro("Informe uma quantidade válida.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      const resultado = await atualizarLoteEmbrioes(
        localId,
        lote.id,
        doadoraId,
        touroId,
        qtd,
        dataProducao || null,
        observacoes.trim() || null,
      );
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CampoAnimalGenetico
        htmlId="doadoraEditarLote"
        localId={localId}
        rotulo="Doadora"
        sexo="femea"
        especie={lote.especie}
        candidatos={candidatos}
        value={doadoraId}
        onValueChange={setDoadoraId}
      />
      <CampoAnimalGenetico
        htmlId="touroEditarLote"
        localId={localId}
        rotulo="Touro"
        sexo="macho"
        especie={lote.especie}
        candidatos={candidatos}
        value={touroId}
        onValueChange={setTouroId}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="quantidadeEditarLote">Quantidade de embriões</Label>
        <Input
          id="quantidadeEditarLote"
          type="number"
          min={0}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dataProducaoEditarLote">Data de produção</Label>
        <Input
          id="dataProducaoEditarLote"
          type="date"
          max={hojeISO}
          value={dataProducao}
          onChange={(e) => setDataProducao(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoesEditarLote">Observações</Label>
        <Textarea
          id="observacoesEditarLote"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento || !doadoraId || !touroId} onClick={confirmar}>
          {emAndamento ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
