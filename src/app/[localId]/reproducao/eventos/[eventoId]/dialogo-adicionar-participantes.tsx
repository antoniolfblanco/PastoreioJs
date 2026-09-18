"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adicionarParticipantesEvento } from "@/lib/actions/coberturas";
import type { CandidatoAnimal, Especie } from "./page";

function identificacao(a: CandidatoAnimal) {
  const base = [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
  return a.externo ? `${base} (externo)` : base;
}

type AcaoAdicionar = (localId: string, eventoId: string, ids: string[]) => Promise<{ error?: string }>;

export function DialogoAdicionarParticipantes({
  localId,
  eventoId,
  especie,
  candidatos,
  jaParticipantes,
  aberto,
  onFechar,
  titulo = "Adicionar fêmeas ao evento",
  rotuloBotao = "Adicionar",
  acao = adicionarParticipantesEvento,
}: {
  localId: string;
  eventoId: string;
  especie: Especie;
  candidatos: CandidatoAnimal[];
  jaParticipantes: Set<string>;
  aberto: boolean;
  onFechar: () => void;
  titulo?: string;
  rotuloBotao?: string;
  // TE/FIV reusa este mesmo diálogo pra escolher as receptoras — só muda a
  // RPC chamada (adicionar_receptoras_evento em vez de
  // adicionar_participantes_evento), a lista/seleção é idêntica.
  acao?: AcaoAdicionar;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent: remontar o Popup no
            meio da própria transição de fechamento fazia a janela "voltar"
            — reabrir sozinha assim que o usuário confirmava a seleção. */}
        <ConteudoAdicionarParticipantes
          key={aberto ? "aberto" : "fechado"}
          localId={localId}
          eventoId={eventoId}
          especie={especie}
          candidatos={candidatos}
          jaParticipantes={jaParticipantes}
          onFechar={onFechar}
          rotuloBotao={rotuloBotao}
          acao={acao}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConteudoAdicionarParticipantes({
  localId,
  eventoId,
  especie,
  candidatos,
  jaParticipantes,
  onFechar,
  rotuloBotao,
  acao,
}: {
  localId: string;
  eventoId: string;
  especie: Especie;
  candidatos: CandidatoAnimal[];
  jaParticipantes: Set<string>;
  onFechar: () => void;
  rotuloBotao: string;
  acao: AcaoAdicionar;
}) {
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const disponiveis = useMemo(
    () => candidatos.filter((a) => a.sexo === "femea" && a.especie === especie && !jaParticipantes.has(a.id)),
    [candidatos, especie, jaParticipantes],
  );

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    if (!buscaMin) return disponiveis;
    return disponiveis.filter((a) =>
      [a.nome, a.brinco, a.tatuagem].filter(Boolean).some((t) => t!.toLowerCase().includes(buscaMin)),
    );
  }, [disponiveis, busca]);

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function confirmar() {
    if (selecionados.size === 0) {
      setErro("Selecione ao menos uma fêmea.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      const resultado = await acao(localId, eventoId, Array.from(selecionados));
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível adicionar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Buscar por nome, brinco ou tatuagem..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <p className="text-sm text-muted-foreground">{selecionados.size} selecionada(s)</p>
      <div className="h-80 overflow-y-auto rounded-md border">
        {dados.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma fêmea disponível encontrada.</p>
        ) : (
          <div className="flex flex-col divide-y">
            {dados.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50">
                <Checkbox checked={selecionados.has(a.id)} onCheckedChange={() => alternar(a.id)} />
                <span className="flex-1">{identificacao(a)}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento || selecionados.size === 0} onClick={confirmar}>
          {emAndamento ? "Adicionando..." : `${rotuloBotao} (${selecionados.size})`}
        </Button>
      </DialogFooter>
    </div>
  );
}
