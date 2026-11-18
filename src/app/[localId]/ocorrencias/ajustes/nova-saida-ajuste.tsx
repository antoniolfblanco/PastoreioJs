"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { PainelLancamento } from "@/components/painel-lancamento";
import type { AnimalSelecionavel } from "@/components/card-selecao-animais";
import { registrarSaidaAjuste } from "@/lib/actions/ajustes";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type Dados = { data: string; responsavel: string; descricao: string; observacoes: string; valorAtual: string };

const iniciais = (): Dados => ({ data: hojeISO(), responsavel: "", descricao: "", observacoes: "", valorAtual: "" });

// Saída de acerto: animais cadastrados que não apareceram na contagem física.
export function NovaSaidaAjuste({ localId, animais }: { localId: string; animais: AnimalSelecionavel[] }) {
  return (
    <PainelLancamento<Dados>
      animais={animais}
      rotuloAbrir="Registrar saída (faltaram na contagem)"
      titulo="Saída de acerto de contagem"
      tituloLista="Saídas a registrar"
      dadosIniciais={iniciais}
      validar={(d) => (d.data ? null : "Informe a data da contagem.")}
      camposMeio={(d, alterar) => (
        <>
          <p className="text-xs text-muted-foreground">
            Marque os animais que não apareceram na contagem física. Eles saem do rebanho sem mexer no estoque inicial do
            ciclo.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataSaidaAjuste">Data</Label>
            <Input id="dataSaidaAjuste" type="date" max={hojeISO()} value={d.data} onChange={(e) => alterar({ data: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelSaidaAjuste">Responsável</Label>
            <Input id="responsavelSaidaAjuste" value={d.responsavel} onChange={(e) => alterar({ responsavel: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoSaidaAjuste">Descrição</Label>
            <Input
              id="descricaoSaidaAjuste"
              placeholder="Ex.: Faltaram na contagem do piquete 3"
              value={d.descricao}
              onChange={(e) => alterar({ descricao: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacoesSaidaAjuste">Observações</Label>
            <Textarea
              id="observacoesSaidaAjuste"
              className="min-h-16"
              value={d.observacoes}
              onChange={(e) => alterar({ observacoes: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Valor de baixa por animal (opcional)</Label>
            <CampoValorReais value={d.valorAtual} onChange={(v) => alterar({ valorAtual: v })} />
          </div>
        </>
      )}
      resumoItem={(d) => ({
        titulo: `${formatarData(d.data)} · ${d.descricao || "Saída de acerto"}`,
        detalhes: [d.responsavel && `por ${d.responsavel}`],
      })}
      gravar={async (item) => {
        const fd = new FormData();
        fd.set("localId", localId);
        fd.set("animalIds", JSON.stringify(item.animais.map((a) => a.id)));
        for (const [k, v] of Object.entries(item.dados)) fd.set(k, v);
        const r = await registrarSaidaAjuste(undefined, fd);
        return r?.erro ?? null;
      }}
      rotuloFinalizar="Finalizar saídas"
      mensagemSucesso={(n) => `${n} animal(is) baixado(s) no acerto de contagem.`}
    />
  );
}
