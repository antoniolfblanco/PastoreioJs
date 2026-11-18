"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { PainelLancamento } from "@/components/painel-lancamento";
import type { AnimalSelecionavel } from "@/components/card-selecao-animais";
import { registrarFurto } from "@/lib/actions/furtos";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type Dados = {
  data: string;
  ocorrencia: string;
  responsavel: string;
  descricao: string;
  observacoes: string;
  valorAtual: string;
};

const iniciais = (): Dados => ({
  data: hojeISO(),
  ocorrencia: "",
  responsavel: "",
  descricao: "",
  observacoes: "",
  valorAtual: "",
});

export function NovoFurto({ localId, animais }: { localId: string; animais: AnimalSelecionavel[] }) {
  return (
    <PainelLancamento<Dados>
      animais={animais}
      rotuloAbrir="Registrar furto"
      titulo="Registrar furtos"
      tituloLista="Furtos a registrar"
      dadosIniciais={iniciais}
      validar={(d) => (d.data ? null : "Informe a data do furto.")}
      camposMeio={(d, alterar) => (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataNovoFurto">Data</Label>
            <Input id="dataNovoFurto" type="date" max={hojeISO()} value={d.data} onChange={(e) => alterar({ data: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ocorrenciaNovoFurto">Ocorrência</Label>
            <Textarea
              id="ocorrenciaNovoFurto"
              className="min-h-16"
              placeholder="Ex.: Cerca cortada na divisa norte, boletim nº..."
              value={d.ocorrencia}
              onChange={(e) => alterar({ ocorrencia: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelNovoFurto">Responsável</Label>
            <Input id="responsavelNovoFurto" value={d.responsavel} onChange={(e) => alterar({ responsavel: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoNovoFurto">Descrição</Label>
            <Input
              id="descricaoNovoFurto"
              placeholder="Ex.: Furto no piquete 3"
              value={d.descricao}
              onChange={(e) => alterar({ descricao: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacoesNovoFurto">Observações</Label>
            <Textarea
              id="observacoesNovoFurto"
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
        titulo: `${formatarData(d.data)} · ${d.descricao || "Furto"}`,
        detalhes: [d.ocorrencia, d.responsavel && `por ${d.responsavel}`],
      })}
      gravar={async (item) => {
        const fd = new FormData();
        fd.set("localId", localId);
        fd.set("animalIds", JSON.stringify(item.animais.map((a) => a.id)));
        for (const [k, v] of Object.entries(item.dados)) fd.set(k, v);
        const r = await registrarFurto(undefined, fd);
        return r?.erro ?? null;
      }}
      rotuloFinalizar="Finalizar furtos"
      mensagemSucesso={(n) => `${n} animal(is) registrado(s) como furto.`}
    />
  );
}
