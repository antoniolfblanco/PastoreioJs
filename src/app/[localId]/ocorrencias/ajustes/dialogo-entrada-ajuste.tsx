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
import { registrarEntradaAjuste } from "@/lib/actions/ajustes";
import type { Especie, OpcaoArea, OpcaoCategoria, OpcaoRaca } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];
const hojeISO = new Date().toISOString().slice(0, 10);

type Props = {
  localId: string;
  aberto: boolean;
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  onFechar: () => void;
};

export function DialogoEntradaAjuste({ localId, aberto, areas, categorias, racas, onFechar }: Props) {
  const [resultado, acao, emAndamento] = useActionState(registrarEntradaAjuste, undefined);

  const [especieFiltro, setEspecieFiltro] = useState<Especie>(categorias[0]?.especie ?? "bovino");
  const [areaId, setAreaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [racaId, setRacaId] = useState(racas.find((r) => r.padrao)?.id ?? "");
  const [grauSangue, setGrauSangue] = useState("Desconhecido");
  const [quantidade, setQuantidade] = useState("1");
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const categoriasDaEspecie = useMemo(
    () => categorias.filter((c) => c.especie === especieFiltro),
    [categorias, especieFiltro],
  );
  const categoriaSelecionada = categorias.find((c) => c.id === categoriaId);

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    toast.success("Entrada de acerto registrada.");
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar entrada de acerto de contagem</DialogTitle>
        </DialogHeader>
        {aberto && (
          <form action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            <p className="text-sm text-muted-foreground">
              Use quando achar animal a mais na contagem física — nunca contado antes. Cria as cabeças
              como um lote, sem identificação individual.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="quantidadeAjuste">Quantidade</Label>
                <Input
                  id="quantidadeAjuste"
                  name="quantidade"
                  type="number"
                  min={1}
                  step={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataAjusteEntrada">Data</Label>
                <Input
                  id="dataAjusteEntrada"
                  name="data"
                  type="date"
                  max={hojeISO}
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="especieAjusteEntrada">Espécie</Label>
                <Select
                  value={especieFiltro}
                  onValueChange={(v) => {
                    const nova = (v ?? "bovino") as Especie;
                    setEspecieFiltro(nova);
                    if (categoriaSelecionada?.especie !== nova) setCategoriaId("");
                  }}
                  items={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
                >
                  <SelectTrigger id="especieAjusteEntrada" className="w-full">
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="areaAjusteEntrada">Área</Label>
                <Select
                  name="areaId"
                  value={areaId}
                  onValueChange={(v) => setAreaId(v ?? "")}
                  items={areas.map((a) => ({ value: a.id, label: a.nome }))}
                >
                  <SelectTrigger id="areaAjusteEntrada" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="categoriaAjusteEntrada">Categoria</Label>
                <Select
                  name="categoriaId"
                  value={categoriaId}
                  onValueChange={(v) => setCategoriaId(v ?? "")}
                  items={categoriasDaEspecie.map((c) => ({ value: c.id, label: c.descricao }))}
                >
                  <SelectTrigger id="categoriaAjusteEntrada" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasDaEspecie.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categoriaSelecionada && (
                  <p className="text-xs text-muted-foreground">
                    Sexo: {categoriaSelecionada.sexo === "macho" ? "Macho" : categoriaSelecionada.sexo === "femea" ? "Fêmea" : "—"}{" "}
                    (definido pela categoria)
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="racaAjusteEntrada">Raça</Label>
                <Select
                  name="racaId"
                  value={racaId}
                  onValueChange={(v) => setRacaId(v ?? "")}
                  items={racas.map((r) => ({ value: r.id, label: r.descricao }))}
                >
                  <SelectTrigger id="racaAjusteEntrada" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {racas.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="grauSangueAjusteEntrada">Grau de sangue</Label>
              <Select
                name="grauSangue"
                value={grauSangue}
                onValueChange={(v) => setGrauSangue(v ?? "Desconhecido")}
                items={grausSangue.map((g) => ({ value: g, label: g }))}
              >
                <SelectTrigger id="grauSangueAjusteEntrada" className="w-full">
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="responsavelAjusteEntrada">Responsável</Label>
              <Input
                id="responsavelAjusteEntrada"
                name="responsavel"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="descricaoAjusteEntrada">Descrição</Label>
              <Input
                id="descricaoAjusteEntrada"
                name="descricao"
                placeholder="Ex.: Sobra encontrada na conferência do piquete 3"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoesAjusteEntrada">Observações</Label>
              <Textarea
                id="observacoesAjusteEntrada"
                name="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Registrando..." : "Registrar entrada"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
