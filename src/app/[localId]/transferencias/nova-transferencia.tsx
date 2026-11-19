"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { PainelLancamento } from "@/components/painel-lancamento";
import type { AnimalSelecionavel } from "@/components/card-selecao-animais";
import { buscarLocalPorCodigo, enviarTransferencia, type DestinoTransferencia } from "@/lib/actions/transferencias";
import { cn } from "@/lib/utils";
import type { OpcaoLocal } from "./page";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type TipoDestino = "meus" | "codigo" | "externo";

type Dados = {
  tipo: TipoDestino;
  localId: string;
  codigoEncontrado: OpcaoLocal | null;
  externo: string;
  data: string;
  responsavel: string;
  descricao: string;
  observacoes: string;
  valor: string;
};

const tipos: { id: TipoDestino; rotulo: string }[] = [
  { id: "meus", rotulo: "Minhas fazendas" },
  { id: "codigo", rotulo: "Por código" },
  { id: "externo", rotulo: "Fora do sistema" },
];

function destinoDe(d: Dados, outrosLocais: OpcaoLocal[]): { destino: DestinoTransferencia; nome: string } | null {
  if (d.tipo === "meus") {
    const local = outrosLocais.find((l) => l.id === d.localId);
    return local ? { destino: { tipo: "local", id: local.id }, nome: local.nome } : null;
  }
  if (d.tipo === "codigo") {
    return d.codigoEncontrado
      ? { destino: { tipo: "local", id: d.codigoEncontrado.id }, nome: d.codigoEncontrado.nome }
      : null;
  }
  const nome = d.externo.trim();
  return nome ? { destino: { tipo: "externo", nome }, nome } : null;
}

// Busca de propriedade pelo código curto (para fazendas de terceiros).
function BuscaCodigo({
  localAtualId,
  encontrado,
  onEncontrado,
}: {
  localAtualId: string;
  encontrado: OpcaoLocal | null;
  onEncontrado: (local: OpcaoLocal | null) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar() {
    setBuscando(true);
    setErro(null);
    onEncontrado(null);
    try {
      const r = await buscarLocalPorCodigo(codigo);
      if ("error" in r) return setErro(r.error);
      if (r.id === localAtualId) return setErro("Esse é o código desta própria propriedade.");
      onEncontrado(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível buscar.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="codigoDestino">Código da propriedade</Label>
      <div className="flex gap-1">
        <Input
          id="codigoDestino"
          value={codigo}
          className="font-mono uppercase"
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar();
            }
          }}
        />
        <Button variant="outline" size="icon" onClick={buscar} disabled={buscando || !codigo.trim()} title="Buscar">
          <Search className="size-4" />
        </Button>
      </div>
      {encontrado && <p className="text-xs text-emerald-700 dark:text-emerald-400">Destino: {encontrado.nome}</p>}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}

export function NovaTransferencia({
  localId,
  animais,
  outrosLocais,
}: {
  localId: string;
  animais: AnimalSelecionavel[];
  outrosLocais: OpcaoLocal[];
}) {
  const iniciais = (): Dados => ({
    tipo: outrosLocais.length > 0 ? "meus" : "codigo",
    localId: "",
    codigoEncontrado: null,
    externo: "",
    data: hojeISO(),
    responsavel: "",
    descricao: "",
    observacoes: "",
    valor: "",
  });

  return (
    <PainelLancamento<Dados>
      animais={animais}
      rotuloAbrir="Enviar animais"
      titulo="Enviar animais para outra propriedade"
      tituloLista="Transferências a registrar"
      dadosIniciais={iniciais}
      validar={(d) => {
        if (!destinoDe(d, outrosLocais)) return "Informe a propriedade de destino.";
        if (!d.data) return "Informe a data.";
        return null;
      }}
      camposMeio={(d, alterar) => (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>Destino</Label>
            <div className="grid grid-cols-1 gap-1">
              {tipos.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => alterar({ tipo: t.id })}
                  className={cn(buttonVariants({ variant: d.tipo === t.id ? "secondary" : "outline", size: "sm" }))}
                >
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>
          {d.tipo === "meus" &&
            (outrosLocais.length === 0 ? (
              <p className="text-xs text-muted-foreground">Você não participa de outra propriedade. Use o código.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="localDestino">Propriedade</Label>
                <Select
                  value={d.localId}
                  onValueChange={(v) => alterar({ localId: (v as string) ?? "" })}
                  items={outrosLocais.map((l) => ({ value: l.id, label: l.nome }))}
                >
                  <SelectTrigger id="localDestino" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {outrosLocais.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          {d.tipo === "codigo" && (
            <BuscaCodigo
              localAtualId={localId}
              encontrado={d.codigoEncontrado}
              onEncontrado={(l) => alterar({ codigoEncontrado: l })}
            />
          )}
          {d.tipo === "externo" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="destinoExterno">Nome da propriedade</Label>
              <Input
                id="destinoExterno"
                placeholder="Ex.: Fazenda do vizinho"
                value={d.externo}
                onChange={(e) => alterar({ externo: e.target.value })}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {d.tipo === "externo"
              ? "Fora do sistema: os animais saem do rebanho na hora e a transferência já fica concluída."
              : "Os animais saem do rebanho na hora; a outra propriedade confirma o recebimento (ou recusa e eles voltam)."}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataTransferencia">Data</Label>
            <Input id="dataTransferencia" type="date" max={hojeISO()} value={d.data} onChange={(e) => alterar({ data: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Valor por cabeça (opcional)</Label>
            <CampoValorReais value={d.valor} onChange={(v) => alterar({ valor: v })} placeholder="Em branco: valor atual" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelTransferencia">Responsável</Label>
            <Input id="responsavelTransferencia" value={d.responsavel} onChange={(e) => alterar({ responsavel: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoTransferencia">Descrição</Label>
            <Input id="descricaoTransferencia" value={d.descricao} onChange={(e) => alterar({ descricao: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacoesTransferencia">Observações</Label>
            <Textarea
              id="observacoesTransferencia"
              className="min-h-16"
              value={d.observacoes}
              onChange={(e) => alterar({ observacoes: e.target.value })}
            />
          </div>
        </>
      )}
      resumoItem={(d) => ({
        titulo: `Para ${destinoDe(d, outrosLocais)?.nome ?? "?"}`,
        detalhes: [
          formatarData(d.data),
          d.tipo === "externo" && "fora do sistema",
          d.valor && `${Number(d.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/cab.`,
          d.descricao,
        ],
      })}
      gravar={async (item) => {
        const destino = destinoDe(item.dados, outrosLocais);
        if (!destino) return "Destino não informado.";
        const r = await enviarTransferencia(localId, {
          destino: destino.destino,
          animalIds: item.animais.map((a) => a.id),
          data: item.dados.data,
          responsavel: item.dados.responsavel,
          descricao: item.dados.descricao,
          observacoes: item.dados.observacoes,
          valorPorCabeca: item.dados.valor,
        });
        return r.error ?? null;
      }}
      rotuloFinalizar="Finalizar transferências"
      mensagemSucesso={(n) => `${n} animal(is) transferido(s).`}
    />
  );
}
