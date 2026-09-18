"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { atualizarRegistroBancoSemen } from "@/lib/actions/banco-genetico";
import { CampoAnimalGenetico } from "./campo-animal-genetico";
import type { CandidatoGenetico, TouroComEstoque } from "./page";

export function DialogoEditarDoses({
  localId,
  candidatos,
  registro,
  onFechar,
}: {
  localId: string;
  candidatos: CandidatoGenetico[];
  registro: TouroComEstoque | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={registro !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar doses de sêmen</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent — mesmo motivo já
            documentado nos outros diálogos do Banco Genético. */}
        {registro && (
          <ConteudoEditarDoses
            key={registro.id}
            localId={localId}
            candidatos={candidatos}
            registro={registro}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoEditarDoses({
  localId,
  candidatos,
  registro,
  onFechar,
}: {
  localId: string;
  candidatos: CandidatoGenetico[];
  registro: TouroComEstoque;
  onFechar: () => void;
}) {
  const [touroId, setTouroId] = useState(registro.touro_id);
  const [quantidade, setQuantidade] = useState(String(registro.quantidade_doses));
  const [observacoes, setObservacoes] = useState(registro.observacoes ?? "");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function confirmar() {
    const qtd = Number(quantidade);
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
      const resultado = await atualizarRegistroBancoSemen(localId, registro.id, touroId, qtd, observacoes.trim() || null);
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
        htmlId="touroEditarDoses"
        localId={localId}
        rotulo="Touro"
        sexo="macho"
        especie={registro.especie}
        candidatos={candidatos}
        value={touroId}
        onValueChange={setTouroId}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="quantidadeEditarDoses">Quantidade de doses</Label>
        <Input
          id="quantidadeEditarDoses"
          type="number"
          min={0}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoesEditarDoses">Observações</Label>
        <Textarea
          id="observacoesEditarDoses"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento || !touroId} onClick={confirmar}>
          {emAndamento ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
