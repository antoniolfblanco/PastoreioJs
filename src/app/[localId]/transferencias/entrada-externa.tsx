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
import { CampoValorReais } from "@/components/campo-valor-reais";
import { registrarEntradaExterna } from "@/lib/actions/transferencias";
import { cn } from "@/lib/utils";
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

function reais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Brincos colados um por linha (ou separados por vírgula/ponto e vírgula).
function lerBrincos(texto: string) {
  return texto
    .split(/[\n,;]+/)
    .map((b) => b.trim())
    .filter(Boolean);
}

type Lote = {
  chave: number;
  areaId: string;
  categoriaId: string;
  racaId: string;
  grauSangue: string;
  quantidade: number;
  valor: string;
  brincos: string[];
};

// Entrada de animais vindos de uma propriedade fora do sistema (sem compra).
// Os animais são criados aqui, então o painel é dados | lista: no topo a
// origem e os dados da transferência, e cada "Adicionar" monta um lote.
export function EntradaExterna({
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
  // Dados da transferência (valem para todos os lotes).
  const [origem, setOrigem] = useState("");
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  // Dados do lote.
  const [especie, setEspecie] = useState<Especie>("bovino");
  const [areaId, setAreaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [racaId, setRacaId] = useState(racaPadrao);
  const [grauSangue, setGrauSangue] = useState("Desconhecido");
  const [quantidade, setQuantidade] = useState("1");
  const [valor, setValor] = useState("");
  const [brincosTexto, setBrincosTexto] = useState("");

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const categoriasDaEspecie = useMemo(() => categorias.filter((c) => c.especie === especie), [categorias, especie]);
  const nomeArea = (id: string) => areas.find((a) => a.id === id)?.nome ?? "—";
  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.descricao ?? "—";
  const nomeRaca = (id: string) => racas.find((r) => r.id === id)?.descricao ?? "—";
  const totalAnimais = lotes.reduce((s, l) => s + l.quantidade, 0);
  const valorTotal = lotes.reduce((s, l) => s + (Number(l.valor) || 0) * l.quantidade, 0);
  const brincos = lerBrincos(brincosTexto);
  const qtd = Number(quantidade);

  function adicionar() {
    if (!areaId) return setErro("Selecione a área.");
    if (!categoriaId) return setErro("Selecione a categoria.");
    if (!racaId) return setErro("Selecione a raça.");
    if (!Number.isInteger(qtd) || qtd < 1) return setErro("Informe uma quantidade válida.");
    if (brincos.length > qtd) return setErro(`Há ${brincos.length} brincos para ${qtd} animal(is).`);
    setErro(undefined);
    setLotes((atual) => [
      ...atual,
      { chave: proximaChave, areaId, categoriaId, racaId, grauSangue, quantidade: qtd, valor, brincos },
    ]);
    setProximaChave((c) => c + 1);
    setCategoriaId("");
    setQuantidade("1");
    setBrincosTexto("");
  }

  function limparTudo() {
    setOrigem("");
    setData(hojeISO());
    setResponsavel("");
    setDescricao("");
    setObservacoes("");
    setAreaId("");
    setCategoriaId("");
    setRacaId(racaPadrao);
    setGrauSangue("Desconhecido");
    setQuantidade("1");
    setValor("");
    setBrincosTexto("");
    setLotes([]);
    setErro(undefined);
  }

  function cancelar() {
    if (lotes.length > 0 && !confirm("Descartar a entrada em andamento?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (lotes.length === 0) return;
    if (!origem.trim()) return setErro("Informe a propriedade de origem.");
    if (!data) return setErro("Informe a data.");
    setEmAndamento(true);
    setErro(undefined);
    try {
      const r = await registrarEntradaExterna(
        localId,
        { origem, data, responsavel, descricao, observacoes },
        lotes.map((l) => ({
          categoriaId: l.categoriaId,
          areaId: l.areaId,
          racaId: l.racaId,
          grauSangue: l.grauSangue,
          quantidade: l.quantidade,
          valorPorCabeca: l.valor,
          brincos: l.brincos,
        })),
      );
      if (r.error) return setErro(r.error);
      toast.success(`${totalAnimais} animal(is) recebido(s) de ${origem.trim()}.`);
      limparTudo();
      setAberta(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setEmAndamento(false);
    }
  }

  if (!aberta) {
    return (
      <div>
        <Button variant="outline" onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          Receber animais de fora do sistema
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Receber animais de fora do sistema</h2>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="origemExterna">Propriedade de origem</Label>
          <Input id="origemExterna" placeholder="Ex.: Fazenda do parceiro" value={origem} onChange={(e) => setOrigem(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dataEntradaExterna">Data</Label>
          <Input id="dataEntradaExterna" type="date" max={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="responsavelEntradaExterna">Responsável</Label>
          <Input id="responsavelEntradaExterna" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descricaoEntradaExterna">Descrição</Label>
          <Input id="descricaoEntradaExterna" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="observacoesEntradaExterna">Observações</Label>
          <Input id="observacoesEntradaExterna" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4">
          <div className="grid grid-cols-3 gap-1">
            {especies.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => {
                  setEspecie(e.value);
                  setCategoriaId("");
                }}
                className={cn(buttonVariants({ variant: especie === e.value ? "secondary" : "outline", size: "sm" }))}
              >
                {e.rotulo}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="areaEntradaExterna">Área</Label>
            <Select value={areaId} onValueChange={(v) => setAreaId((v as string) ?? "")} items={areas.map((a) => ({ value: a.id, label: a.nome }))}>
              <SelectTrigger id="areaEntradaExterna" className="w-full">
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
            <Label htmlFor="categoriaEntradaExterna">Categoria</Label>
            <Select
              value={categoriaId}
              onValueChange={(v) => setCategoriaId((v as string) ?? "")}
              items={categoriasDaEspecie.map((c) => ({ value: c.id, label: c.descricao }))}
            >
              <SelectTrigger id="categoriaEntradaExterna" className="w-full">
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
              <Label htmlFor="racaEntradaExterna">Raça</Label>
              <Select value={racaId} onValueChange={(v) => setRacaId((v as string) ?? "")} items={racas.map((r) => ({ value: r.id, label: r.descricao }))}>
                <SelectTrigger id="racaEntradaExterna" className="w-full">
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
              <Label htmlFor="grauEntradaExterna">Grau de sangue</Label>
              <Select
                value={grauSangue}
                onValueChange={(v) => setGrauSangue((v as string) ?? "Desconhecido")}
                items={grausSangue.map((g) => ({ value: g, label: g }))}
              >
                <SelectTrigger id="grauEntradaExterna" className="w-full">
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
              <Label htmlFor="qtdEntradaExterna">Quantidade</Label>
              <Input id="qtdEntradaExterna" type="number" min="1" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Valor por cabeça</Label>
              <CampoValorReais value={valor} onChange={setValor} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brincosEntradaExterna">Brincos (opcional)</Label>
            <Textarea
              id="brincosEntradaExterna"
              className="min-h-16 font-mono"
              placeholder="Um por linha, na ordem dos animais"
              value={brincosTexto}
              onChange={(e) => setBrincosTexto(e.target.value)}
            />
            {brincos.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {brincos.length} brinco(s); {Math.max(0, (Number.isInteger(qtd) ? qtd : 0) - brincos.length)} animal(is) sem
                brinco.
              </span>
            )}
          </div>
          <Button onClick={adicionar}>
            Adicionar {Number.isInteger(qtd) && qtd > 0 ? `(${qtd})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Lotes a receber</CardTitle>
            <CardDescription>
              {totalAnimais} animal(is) em {lotes.length} lote(s){valorTotal > 0 ? ` · ${reais(valorTotal)}` : ""}
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
                      <TableHead className="text-right">Valor</TableHead>
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
                              {[
                                `${nomeRaca(l.racaId)} ${l.grauSangue}`,
                                l.brincos.length > 0 && `brincos: ${l.brincos.join(", ")}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{l.quantidade}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(l.valor) > 0 ? reais(Number(l.valor) * l.quantidade) : "—"}
                        </TableCell>
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
        {emAndamento ? "Registrando..." : `Finalizar entrada (${totalAnimais} animais)`}
      </Button>
    </div>
  );
}
