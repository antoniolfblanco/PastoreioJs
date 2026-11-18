"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { PainelLancamento } from "@/components/painel-lancamento";
import type { AnimalSelecionavel } from "@/components/card-selecao-animais";
import { registrarConsumo } from "@/lib/actions/consumo";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type Dados = {
  data: string;
  destino: string;
  pesoVivo: string;
  pesoCarne: string;
  responsavel: string;
  descricao: string;
  observacoes: string;
  valorAtual: string;
};

const iniciais = (): Dados => ({
  data: hojeISO(),
  destino: "",
  pesoVivo: "",
  pesoCarne: "",
  responsavel: "",
  descricao: "",
  observacoes: "",
  valorAtual: "",
});

export function NovoConsumo({ localId, animais }: { localId: string; animais: AnimalSelecionavel[] }) {
  return (
    <PainelLancamento<Dados>
      animais={animais}
      rotuloAbrir="Registrar consumo"
      titulo="Registrar consumo"
      tituloLista="Consumos a registrar"
      dadosIniciais={iniciais}
      validar={(d) => (d.data ? null : "Informe a data do consumo.")}
      // Pesos são do grupo abatido; não fazem sentido no próximo.
      aposAdicionar={(d) => ({ ...d, pesoVivo: "", pesoCarne: "", observacoes: "" })}
      camposMeio={(d, alterar) => (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataNovoConsumo">Data</Label>
            <Input id="dataNovoConsumo" type="date" max={hojeISO()} value={d.data} onChange={(e) => alterar({ data: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destinoNovoConsumo">Destino</Label>
            <Input
              id="destinoNovoConsumo"
              placeholder="Ex.: Consumo próprio"
              value={d.destino}
              onChange={(e) => alterar({ destino: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pesoVivoNovoConsumo">Peso vivo (kg)</Label>
              <Input
                id="pesoVivoNovoConsumo"
                type="number"
                step="0.01"
                min="0"
                value={d.pesoVivo}
                onChange={(e) => alterar({ pesoVivo: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pesoCarneNovoConsumo">Peso carne (kg)</Label>
              <Input
                id="pesoCarneNovoConsumo"
                type="number"
                step="0.01"
                min="0"
                value={d.pesoCarne}
                onChange={(e) => alterar({ pesoCarne: e.target.value })}
              />
            </div>
          </div>
          <span className="-mt-1 text-xs text-muted-foreground">Pesos totais dos animais deste registro.</span>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelNovoConsumo">Responsável</Label>
            <Input id="responsavelNovoConsumo" value={d.responsavel} onChange={(e) => alterar({ responsavel: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoNovoConsumo">Descrição</Label>
            <Input
              id="descricaoNovoConsumo"
              placeholder="Ex.: Abate pra churrasco da equipe"
              value={d.descricao}
              onChange={(e) => alterar({ descricao: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacoesNovoConsumo">Observações</Label>
            <Textarea
              id="observacoesNovoConsumo"
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
        titulo: `${formatarData(d.data)} · ${d.destino || "Destino não informado"}`,
        detalhes: [
          d.pesoVivo && `${d.pesoVivo} kg vivo`,
          d.pesoCarne && `${d.pesoCarne} kg carne`,
          d.descricao,
          d.responsavel && `por ${d.responsavel}`,
        ],
      })}
      gravar={async (item) => {
        const fd = new FormData();
        fd.set("localId", localId);
        fd.set("animalIds", JSON.stringify(item.animais.map((a) => a.id)));
        for (const [k, v] of Object.entries(item.dados)) fd.set(k, v);
        const r = await registrarConsumo(undefined, fd);
        return r?.erro ?? null;
      }}
      rotuloFinalizar="Finalizar consumos"
      mensagemSucesso={(n) => `${n} animal(is) registrado(s) como consumo.`}
    />
  );
}
