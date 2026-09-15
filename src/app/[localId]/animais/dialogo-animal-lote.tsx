"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { CampoValorReais } from "@/components/campo-valor-reais";
import { criarAnimaisEmLote } from "@/lib/actions/animais";
import { CampoArea } from "./campo-area";
import { CampoCategoria } from "./campo-categoria";
import { CampoRaca } from "./campo-raca";
import type { CategoriaIvz, Especie, OpcaoArea, OpcaoCategoria, OpcaoRaca } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];

function exigeRegistro(grauSangue: string) {
  return grauSangue !== "SR" && grauSangue !== "Desconhecido";
}

const hojeISO = new Date().toISOString().slice(0, 10);

type Props = {
  localId: string;
  aberto: boolean;
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  categoriasIvz: CategoriaIvz[];
  temCicloAtivo: boolean;
  onFechar: () => void;
};

export function DialogoAnimalLote({
  localId,
  aberto,
  areas,
  categorias,
  racas,
  categoriasIvz,
  temCicloAtivo,
  onFechar,
}: Props) {
  const [resultado, acao, emAndamento] = useActionState(criarAnimaisEmLote, undefined);

  const [especieFiltro, setEspecieFiltro] = useState<Especie>(categorias[0]?.especie ?? "bovino");
  const [areasLocais, setAreasLocais] = useState(areas);
  const [areaId, setAreaId] = useState("");
  const [categoriasLocais, setCategoriasLocais] = useState(categorias);
  const [categoriaId, setCategoriaId] = useState("");
  const [racasLocais, setRacasLocais] = useState(racas);
  const [racaId, setRacaId] = useState(racas.find((r) => r.padrao)?.id ?? "");
  const [grauSangue, setGrauSangue] = useState("Desconhecido");
  const [dataNascimento, setDataNascimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [registroProvisorio, setRegistroProvisorio] = useState("");
  const [registroDefinitivo, setRegistroDefinitivo] = useState("");
  const [valor, setValor] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  const categoriasDaEspecie = useMemo(
    () => categoriasLocais.filter((c) => c.especie === especieFiltro),
    [categoriasLocais, especieFiltro],
  );
  const categoriaSelecionada = categoriasLocais.find((c) => c.id === categoriaId);

  // Sem key no local onde é usado, esse diálogo não remontaria ao reabrir e
  // os campos ficariam presos no valor da última vez — em vez de limpar
  // manualmente aqui (setState dentro de efeito), o componente pai remonta
  // com `key={loteAberto ? "aberto" : "fechado"}`, o que já reseta tudo.
  function fechar(estaAberto: boolean) {
    if (!estaAberto) onFechar();
  }

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success("Animais cadastrados com sucesso!");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar animais em lote</DialogTitle>
        </DialogHeader>
        {aberto && (
          <form action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <p className="text-sm text-muted-foreground">
              Cria várias cabeças de uma vez, todas sem identificação individual (sem nome, brinco ou
              tatuagem), com os dados abaixo em comum.
            </p>

            {temCicloAtivo && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                Já existe um ciclo em andamento. Cadastrar aqui soma no estoque inicial dele — se os
                animais nasceram ou foram comprados durante o ciclo, prefira as rotinas de
                Nascimento/Compra (em breve).
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="valorAnimalLote">Valor por cabeça (R$, opcional)</Label>
                <CampoValorReais value={valor} onChange={setValor} className="max-w-40" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="quantidadeAnimalLote">Quantidade</Label>
                <Input
                  id="quantidadeAnimalLote"
                  name="quantidade"
                  type="number"
                  min={1}
                  step={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="especieAnimalLote">Espécie</Label>
                <Select
                  value={especieFiltro}
                  onValueChange={(v) => {
                    const nova = (v ?? "bovino") as Especie;
                    setEspecieFiltro(nova);
                    if (categoriaSelecionada?.especie !== nova) setCategoriaId("");
                  }}
                  items={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
                >
                  <SelectTrigger id="especieAnimalLote" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(rotulosEspecie).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CampoArea
                htmlId="areaAnimalLote"
                value={areaId}
                onValueChange={setAreaId}
                areas={areasLocais}
                localId={localId}
                onCriada={(area) => setAreasLocais((atual) => [...atual, area])}
              />
              <CampoCategoria
                htmlId="categoriaAnimalLote"
                value={categoriaId}
                onValueChange={setCategoriaId}
                categorias={categoriasDaEspecie}
                categoriasIvz={categoriasIvz}
                especie={especieFiltro}
                localId={localId}
                onCriada={(categoria) => setCategoriasLocais((atual) => [...atual, categoria])}
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataNascimentoAnimalLote">Data de nascimento</Label>
                <Input
                  id="dataNascimentoAnimalLote"
                  name="dataNascimento"
                  type="date"
                  max={hojeISO}
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
            </div>

            <CampoRaca
              htmlId="racaAnimalLote"
              value={racaId}
              onValueChange={setRacaId}
              racas={racasLocais}
              localId={localId}
              onCriada={(raca) => setRacasLocais((atual) => [...atual, raca])}
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="grauSangueAnimalLote">Grau de sangue</Label>
              <Select
                name="grauSangue"
                value={grauSangue}
                onValueChange={(v) => setGrauSangue(v ?? "Desconhecido")}
                items={grausSangue.map((g) => ({ value: g, label: g }))}
              >
                <SelectTrigger id="grauSangueAnimalLote" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {grausSangue.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {exigeRegistro(grauSangue) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="registroProvisorioAnimalLote">Registro provisório</Label>
                  <Input
                    id="registroProvisorioAnimalLote"
                    name="registroProvisorio"
                    value={registroProvisorio}
                    onChange={(e) => setRegistroProvisorio(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="registroDefinitivoAnimalLote">Registro definitivo</Label>
                  <Input
                    id="registroDefinitivoAnimalLote"
                    name="registroDefinitivo"
                    value={registroDefinitivo}
                    onChange={(e) => setRegistroDefinitivo(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoesAnimalLote">Observações</Label>
              <Textarea
                id="observacoesAnimalLote"
                name="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
            <input type="hidden" name="valor" value={valor} />

            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Cadastrando..." : "Cadastrar animais"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
