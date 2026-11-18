"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { registrarEntradaAjuste } from "@/lib/actions/ajustes";
import type { Especie, OpcaoArea, OpcaoCategoria, OpcaoRaca } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

// Um lote de entrada: N cabeças de uma categoria numa área.
type Lote = {
  chave: number;
  areaId: string;
  categoriaId: string;
  racaId: string;
  grauSangue: string;
  quantidade: number;
  data: string;
  responsavel: string;
  descricao: string;
  observacoes: string;
};

// Entrada de acerto: animais a mais na contagem física, nunca contados
// antes. Não há animal pra selecionar (eles são criados), então o painel é
// dados do lote | lista, com o Finalizar embaixo.
export function NovaEntradaAjuste({
  localId,
  areas,
  categorias,
  racas,
}: {
  localId: string;
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
}) {
  const racaPadrao = racas.find((r) => r.padrao)?.id ?? "";
  const [aberta, setAberta] = useState(false);
  const [especie, setEspecie] = useState<Especie>("bovino");
  const [areaId, setAreaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [racaId, setRacaId] = useState(racaPadrao);
  const [grauSangue, setGrauSangue] = useState("Desconhecido");
  const [quantidade, setQuantidade] = useState("1");
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const categoriasDaEspecie = useMemo(() => categorias.filter((c) => c.especie === especie), [categorias, especie]);
  const nomeArea = (id: string) => areas.find((a) => a.id === id)?.nome ?? "—";
  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.descricao ?? "—";
  const nomeRaca = (id: string) => racas.find((r) => r.id === id)?.descricao ?? "—";
  const totalAnimais = lotes.reduce((s, l) => s + l.quantidade, 0);
  const qtd = Number(quantidade);

  function trocarEspecie(nova: Especie) {
    setEspecie(nova);
    setCategoriaId("");
  }

  function adicionar() {
    if (!areaId) return setErro("Selecione a área.");
    if (!categoriaId) return setErro("Selecione a categoria.");
    if (!racaId) return setErro("Selecione a raça.");
    if (!Number.isInteger(qtd) || qtd < 1) return setErro("Informe uma quantidade válida.");
    if (!data) return setErro("Informe a data da contagem.");
    setErro(undefined);
    setLotes((atual) => [
      ...atual,
      { chave: proximaChave, areaId, categoriaId, racaId, grauSangue, quantidade: qtd, data, responsavel, descricao, observacoes },
    ]);
    setProximaChave((c) => c + 1);
    // Área, data, responsável e descrição ficam; categoria e quantidade mudam
    // de um lote pro outro.
    setCategoriaId("");
    setQuantidade("1");
  }

  function limparTudo() {
    setAreaId("");
    setCategoriaId("");
    setRacaId(racaPadrao);
    setGrauSangue("Desconhecido");
    setQuantidade("1");
    setData(hojeISO());
    setResponsavel("");
    setDescricao("");
    setObservacoes("");
    setLotes([]);
    setErro(undefined);
  }

  function cancelar() {
    if (lotes.length > 0 && !confirm("Descartar as entradas em andamento?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (lotes.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);
    let gravados = 0;
    for (const l of lotes) {
      const fd = new FormData();
      fd.set("localId", localId);
      fd.set("areaId", l.areaId);
      fd.set("categoriaId", l.categoriaId);
      fd.set("racaId", l.racaId);
      fd.set("grauSangue", l.grauSangue);
      fd.set("quantidade", String(l.quantidade));
      fd.set("data", l.data);
      fd.set("responsavel", l.responsavel);
      fd.set("descricao", l.descricao);
      fd.set("observacoes", l.observacoes);
      const r = await registrarEntradaAjuste(undefined, fd);
      if (r?.erro) {
        setLotes(lotes.slice(gravados));
        setErro((gravados > 0 ? `${gravados} lote(s) gravado(s), mas o seguinte falhou. ` : "") + r.erro);
        setEmAndamento(false);
        return;
      }
      gravados++;
    }
    setEmAndamento(false);
    toast.success(`${totalAnimais} animal(is) incluído(s) no acerto de contagem.`);
    limparTudo();
    setAberta(false);
  }

  if (!aberta) {
    return (
      <div>
        <Button variant="outline" onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          Registrar entrada (sobraram na contagem)
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Entrada de acerto de contagem</h2>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">
            Animais a mais na contagem física, nunca contados antes. São criados sem identificação e não somam no estoque
            inicial do ciclo.
          </p>
          <div className="grid grid-cols-3 gap-1">
            {especies.map((e) => (
              <button
                key={e.value}
                type="button"
                disabled={lotes.length > 0 && e.value !== especie}
                onClick={() => trocarEspecie(e.value)}
                className={cn(buttonVariants({ variant: especie === e.value ? "secondary" : "outline", size: "sm" }))}
              >
                {e.rotulo}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="areaEntradaAjuste">Área</Label>
            <Select value={areaId} onValueChange={(v) => setAreaId(v ?? "")} items={areas.map((a) => ({ value: a.id, label: a.nome }))}>
              <SelectTrigger id="areaEntradaAjuste" className="w-full">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoriaEntradaAjuste">Categoria</Label>
            <Select
              value={categoriaId}
              onValueChange={(v) => setCategoriaId(v ?? "")}
              items={categoriasDaEspecie.map((c) => ({ value: c.id, label: c.descricao }))}
            >
              <SelectTrigger id="categoriaEntradaAjuste" className="w-full">
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
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="racaEntradaAjuste">Raça</Label>
              <Select value={racaId} onValueChange={(v) => setRacaId(v ?? "")} items={racas.map((r) => ({ value: r.id, label: r.descricao }))}>
                <SelectTrigger id="racaEntradaAjuste" className="w-full">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grauEntradaAjuste">Grau de sangue</Label>
              <Select
                value={grauSangue}
                onValueChange={(v) => setGrauSangue(v ?? "Desconhecido")}
                items={grausSangue.map((g) => ({ value: g, label: g }))}
              >
                <SelectTrigger id="grauEntradaAjuste" className="w-full">
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
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qtdEntradaAjuste">Quantidade</Label>
              <Input id="qtdEntradaAjuste" type="number" min="1" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataEntradaAjuste">Data</Label>
              <Input id="dataEntradaAjuste" type="date" max={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelEntradaAjuste">Responsável</Label>
            <Input id="responsavelEntradaAjuste" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoEntradaAjuste">Descrição</Label>
            <Input
              id="descricaoEntradaAjuste"
              placeholder="Ex.: Sobra na conferência do piquete 3"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacoesEntradaAjuste">Observações</Label>
            <Textarea id="observacoesEntradaAjuste" className="min-h-16" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <Button onClick={adicionar}>
            Adicionar {Number.isInteger(qtd) && qtd > 0 ? `(${qtd})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Entradas a registrar</CardTitle>
            <CardDescription>
              {totalAnimais} animal(is) em {lotes.length} lote(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lotes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Preencha área, categoria e quantidade e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Animais</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((l) => (
                      <TableRow key={l.chave}>
                        <TableCell>
                          <span className="flex flex-col gap-0.5">
                            <span className="font-medium">
                              {nomeCategoria(l.categoriaId)} · {nomeArea(l.areaId)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {[formatarData(l.data), `${nomeRaca(l.racaId)} ${l.grauSangue}`, l.descricao, l.responsavel && `por ${l.responsavel}`]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{l.quantidade}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            title="Tirar da lista"
                            onClick={() => setLotes((atual) => atual.filter((x) => x.chave !== l.chave))}
                          >
                            <X className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button size="lg" className="h-12 text-base" disabled={lotes.length === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Registrando..." : `Finalizar entradas (${totalAnimais} animais)`}
      </Button>
    </div>
  );
}
