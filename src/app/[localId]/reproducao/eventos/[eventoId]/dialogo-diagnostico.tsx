"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { registrarDiagnosticosGestacao } from "@/lib/actions/coberturas";
import type { CertezaDiagnostico, Participante, ResultadoDiagnostico } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

const resultados: { value: ResultadoDiagnostico; rotulo: string }[] = [
  { value: "prenha", rotulo: "Prenha" },
  { value: "vazia", rotulo: "Vazia" },
  { value: "inconclusivo", rotulo: "Inconclusivo" },
];

const certezas: { value: CertezaDiagnostico; rotulo: string }[] = [
  { value: "certo", rotulo: "Certo" },
  { value: "provavel", rotulo: "Provável" },
];

export function DialogoDiagnostico({
  localId,
  eventoId,
  participantes,
  onFechar,
}: {
  localId: string;
  eventoId: string;
  participantes: Participante[] | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={participantes !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar diagnóstico ({participantes?.length ?? 0})</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent — mesma causa do bug já
            corrigido no Banco Genético/Manejos Sanitários. */}
        {participantes && (
          <ConteudoDiagnostico
            key={participantes.map((p) => p.id).join(",")}
            localId={localId}
            eventoId={eventoId}
            participantes={participantes}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoDiagnostico({
  localId,
  eventoId,
  participantes,
  onFechar,
}: {
  localId: string;
  eventoId: string;
  participantes: Participante[];
  onFechar: () => void;
}) {
  const [resultadosPorId, setResultadosPorId] = useState<Map<string, ResultadoDiagnostico>>(new Map());
  const [certezasPorId, setCertezasPorId] = useState<Map<string, CertezaDiagnostico>>(new Map());
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  function marcarResultado(id: string, resultado: ResultadoDiagnostico) {
    setResultadosPorId((atual) => new Map(atual).set(id, resultado));
    if (resultado !== "prenha") {
      setCertezasPorId((atual) => {
        const novo = new Map(atual);
        novo.delete(id);
        return novo;
      });
    }
  }

  function marcarCerteza(id: string, certeza: CertezaDiagnostico) {
    setCertezasPorId((atual) => new Map(atual).set(id, certeza));
  }

  async function confirmar() {
    if (resultadosPorId.size === 0) {
      setErro("Marque o resultado de ao menos uma fêmea.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      await registrarDiagnosticosGestacao(localId, eventoId, {
        resultados: Array.from(resultadosPorId.entries()).map(([coberturaId, resultado]) => ({
          coberturaId,
          resultado,
          certeza: certezasPorId.get(coberturaId) ?? null,
        })),
        data,
        responsavel: responsavel.trim() || null,
        observacoes: observacoes.trim() || null,
      });
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {participantes.map((p) => {
          const resultado = resultadosPorId.get(p.id);
          const certeza = certezasPorId.get(p.id);
          return (
            <div key={p.id} className="rounded-md border p-3">
              <p className="text-sm font-medium">{p.identificacao}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {resultados.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => marcarResultado(p.id, r.value)}
                    className={cn(buttonVariants({ variant: resultado === r.value ? "secondary" : "outline", size: "sm" }))}
                  >
                    {r.rotulo}
                  </button>
                ))}
              </div>
              {resultado === "prenha" && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Certeza de que é deste evento:</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {certezas.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => marcarCerteza(p.id, c.value)}
                        className={cn(buttonVariants({ variant: certeza === c.value ? "secondary" : "outline", size: "xs" }))}
                      >
                        {c.rotulo}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataDiagnostico">Data</Label>
          <Input id="dataDiagnostico" type="date" max={hojeISO} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="responsavelDiagnostico">Responsável</Label>
          <Input id="responsavelDiagnostico" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoesDiagnostico">Observações</Label>
        <Textarea id="observacoesDiagnostico" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento || resultadosPorId.size === 0} onClick={confirmar}>
          {emAndamento ? "Registrando..." : `Registrar (${resultadosPorId.size})`}
        </Button>
      </DialogFooter>
    </div>
  );
}
