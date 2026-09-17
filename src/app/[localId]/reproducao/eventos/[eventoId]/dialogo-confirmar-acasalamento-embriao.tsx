"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { confirmarAcasalamentoEmbriao } from "@/lib/actions/coberturas";
import type { LoteEmbriaoOpcao } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

// Etapa 2 do fluxo de TE/FIV: escolher o lote de embriões (doadora × touro)
// pras receptoras já adicionadas ao evento — o análogo do "escolher o
// touro" da IA, só que preenche femea_id/touro_id de uma vez e desconta o
// lote.
export function DialogoConfirmarAcasalamentoEmbriao({
  localId,
  eventoId,
  lotesEmbriao,
  coberturaIds,
  onFechar,
}: {
  localId: string;
  eventoId: string;
  lotesEmbriao: LoteEmbriaoOpcao[];
  coberturaIds: string[] | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={coberturaIds !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar acasalamento ({coberturaIds?.length ?? 0})</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent — mesmo motivo já
            documentado nos outros diálogos deste evento. */}
        {coberturaIds && (
          <ConteudoConfirmarAcasalamentoEmbriao
            key={coberturaIds.join(",")}
            localId={localId}
            eventoId={eventoId}
            lotesEmbriao={lotesEmbriao}
            coberturaIds={coberturaIds}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoConfirmarAcasalamentoEmbriao({
  localId,
  eventoId,
  lotesEmbriao,
  coberturaIds,
  onFechar,
}: {
  localId: string;
  eventoId: string;
  lotesEmbriao: LoteEmbriaoOpcao[];
  coberturaIds: string[];
  onFechar: () => void;
}) {
  const [loteId, setLoteId] = useState("");
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const qtdNecessaria = coberturaIds.length;
  const lote = useMemo(() => lotesEmbriao.find((l) => l.id === loteId), [lotesEmbriao, loteId]);

  async function confirmar() {
    if (!loteId) {
      setErro("Selecione o lote de embriões.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      await confirmarAcasalamentoEmbriao(localId, eventoId, {
        coberturaIds,
        loteEmbriaoId: loteId,
        data,
        responsavel: responsavel.trim() || null,
      });
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível confirmar.");
    } finally {
      setEmAndamento(false);
    }
  }

  if (lotesEmbriao.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum lote de embriões com quantidade disponível.{" "}
        <Link href={`/${localId}/reproducao/banco-genetico`} className="underline">
          Cadastrar lote de embriões
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Lote de embriões (precisa de {qtdNecessaria})</Label>
        <div className="flex flex-col divide-y rounded-md border">
          {lotesEmbriao.map((l) => {
            const insuficiente = l.quantidade < qtdNecessaria;
            return (
              <label
                key={l.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm",
                  insuficiente ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="loteEmbriaoConfirmar"
                  checked={loteId === l.id}
                  disabled={insuficiente}
                  onChange={() => setLoteId(l.id)}
                />
                <span className="flex-1">
                  {l.doadoraIdentificacao} × {l.touroIdentificacao}
                </span>
                <Badge variant="outline">{l.quantidade} disponível(is)</Badge>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataAcasalamentoEmbriao">Data</Label>
          <Input
            id="dataAcasalamentoEmbriao"
            type="date"
            max={hojeISO}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="responsavelAcasalamentoEmbriao">Responsável</Label>
          <Input
            id="responsavelAcasalamentoEmbriao"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />
        </div>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Link
          href={`/${localId}/reproducao/banco-genetico`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mr-auto")}
        >
          Cadastrar novo lote
        </Link>
        <Button type="button" disabled={emAndamento || !loteId || (lote?.quantidade ?? 0) < qtdNecessaria} onClick={confirmar}>
          {emAndamento ? "Confirmando..." : "Confirmar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
