"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, ChevronRight, ArrowRight, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { CardSelecaoAnimais, identificacaoAnimal as identificacao } from "@/components/card-selecao-animais";
import { cn } from "@/lib/utils";
import { registrarVenda } from "@/lib/actions/vendas";
import type { AnimalParaVenda, Especie } from "./page";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarReais(valor: number | null) {
  return valor != null ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
}

function formatarKg(peso: number | null) {
  return peso != null ? `${peso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg` : "—";
}

function numero(texto: string): number | null {
  const n = Number(texto.replace(",", "."));
  return texto.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

type ModoPreco = "kg" | "cabeca";
type ModoPeso = "lote" | "individual";

// Cada clique em "Adicionar" vira um item da venda: os animais marcados
// naquele momento, com o preço e o peso informados ali. O peso é sempre
// guardado por animal (o do lote é dividido igual entre eles) — é assim que
// a venda grava no banco.
type ItemVenda = {
  chave: number;
  animais: AnimalParaVenda[];
  modoPreco: ModoPreco;
  preco: number | null;
  modoPeso: ModoPeso;
  pesoPorAnimal: number | null;
};

function valorPorAnimal(item: ItemVenda): number | null {
  if (item.preco == null) return null;
  if (item.modoPreco === "cabeca") return item.preco;
  return item.pesoPorAnimal != null ? item.pesoPorAnimal * item.preco : null;
}

export function NovaVenda({ localId, animais }: { localId: string; animais: AnimalParaVenda[] }) {
  const [aberta, setAberta] = useState(false);

  // Dados da venda
  const [data, setData] = useState(hojeISO);
  const [descricao, setDescricao] = useState("");
  const [comprador, setComprador] = useState("");
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  const [prazoRecebimento, setPrazoRecebimento] = useState("");
  const [recebido, setRecebido] = useState(false);
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [aRendimento, setARendimento] = useState(false);

  // Seleção
  const [especie, setEspecie] = useState<Especie>("bovino");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  // Preço e peso (entre os cards)
  const [modoPreco, setModoPreco] = useState<ModoPreco>("kg");
  const [preco, setPreco] = useState("");
  const [modoPeso, setModoPeso] = useState<ModoPeso>("lote");
  const [peso, setPeso] = useState("");

  // Lista da venda
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [itensAbertos, setItensAbertos] = useState<Set<number>>(new Set());

  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const idsNaVenda = useMemo(() => new Set(itens.flatMap((i) => i.animais.map((a) => a.id))), [itens]);

  function trocarEspecie(nova: Especie) {
    setEspecie(nova);
    setMarcados(new Set());
  }

  const qtdMarcados = marcados.size;
  const rotuloPeso =
    modoPeso === "lote" ? "Peso do lote (kg)" : qtdMarcados > 1 ? "Peso médio (kg)" : "Peso individual (kg)";

  function adicionar() {
    if (qtdMarcados === 0) return;
    const pesoInformado = numero(peso);
    if (modoPreco === "kg" && pesoInformado == null) {
      const ok = confirm(
        "O preço é por kg, mas o peso está vazio — o valor desse(s) animal(is) vai ficar em branco. Adicionar mesmo assim?",
      );
      if (!ok) return;
    }

    const selecionados = animais.filter((a) => marcados.has(a.id));
    const pesoPorAnimal =
      pesoInformado == null ? null : modoPeso === "lote" ? pesoInformado / selecionados.length : pesoInformado;

    setItens((atual) => [
      ...atual,
      { chave: proximaChave, animais: selecionados, modoPreco, preco: numero(preco), modoPeso, pesoPorAnimal },
    ]);
    setProximaChave((c) => c + 1);
    setMarcados(new Set());
    // Zera só o peso — o preço costuma valer pro próximo lote também.
    setPeso("");
  }

  function removerItem(chave: number) {
    setItens((atual) => atual.filter((i) => i.chave !== chave));
  }

  function alternarItemAberto(chave: number) {
    setItensAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  const resumo = useMemo(() => {
    let quantidade = 0;
    let somaPeso = 0;
    let qtdComPeso = 0;
    let somaValor = 0;
    let qtdComValor = 0;
    let somaValorComPeso = 0;
    let somaPesoComValor = 0;
    for (const item of itens) {
      const n = item.animais.length;
      const valor = valorPorAnimal(item);
      quantidade += n;
      if (item.pesoPorAnimal != null) {
        somaPeso += item.pesoPorAnimal * n;
        qtdComPeso += n;
      }
      if (valor != null) {
        somaValor += valor * n;
        qtdComValor += n;
        if (item.pesoPorAnimal != null) {
          somaValorComPeso += valor * n;
          somaPesoComValor += item.pesoPorAnimal * n;
        }
      }
    }
    return {
      quantidade,
      pesoMedio: qtdComPeso ? somaPeso / qtdComPeso : null,
      precoMedioKg: somaPesoComValor ? somaValorComPeso / somaPesoComValor : null,
      precoMedioCabeca: qtdComValor ? somaValor / qtdComValor : null,
      valorTotal: qtdComValor ? somaValor : null,
      semValor: quantidade - qtdComValor,
    };
  }, [itens]);

  function limparTudo() {
    setData(hojeISO());
    setDescricao("");
    setComprador("");
    setPrazoRecebimento("");
    setRecebido(false);
    setResponsavel("");
    setObservacoes("");
    setARendimento(false);
    setMarcados(new Set());
    setPreco("");
    setPeso("");
    setItens([]);
    setItensAbertos(new Set());
    setErro(undefined);
  }

  function cancelar() {
    if (itens.length > 0 && !confirm("Descartar a venda em andamento?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (itens.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);

    const animaisPayload = itens.flatMap((item) => {
      const valor = valorPorAnimal(item);
      return item.animais.map((a) => ({
        animal_id: a.id,
        peso_venda: item.pesoPorAnimal,
        a_rendimento: aRendimento,
        valor_venda_previsto: aRendimento ? valor : null,
        valor_venda_definitivo: aRendimento ? null : valor,
      }));
    });

    const formData = new FormData();
    formData.set("localId", localId);
    formData.set("animais", JSON.stringify(animaisPayload));
    formData.set("comprador", comprador);
    formData.set("data", data);
    formData.set("prazoRecebimento", prazoRecebimento);
    if (recebido) formData.set("recebido", "on");
    formData.set("responsavel", responsavel);
    formData.set("descricao", descricao);
    formData.set("observacoes", observacoes);

    const resultado = await registrarVenda(undefined, formData);
    setEmAndamento(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    toast.success(`Venda registrada: ${animaisPayload.length} animal(is).`);
    limparTudo();
    setAberta(false);
  }

  if (!aberta) {
    return (
      <div>
        <Button onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          Nova venda
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Nova venda</h2>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>

      {/* Dados da venda */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dataVenda">Data</Label>
          <Input
            id="dataVenda"
            type="date"
            max={hojeISO()}
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="descricaoVenda">Descrição</Label>
          <Input
            id="descricaoVenda"
            placeholder="Ex.: venda de novilhos"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="compradorVenda">Comprador</Label>
          <Input id="compradorVenda" value={comprador} onChange={(e) => setComprador(e.target.value)} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMaisOpcoes((v) => !v)}>
          {maisOpcoes ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          Mais opções
        </Button>
      </div>

      {maisOpcoes && (
        <div className="flex flex-wrap items-end gap-3 rounded-md bg-muted/30 p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prazoRecebimentoVenda">Prazo recebimento</Label>
            <Input
              id="prazoRecebimentoVenda"
              type="date"
              value={prazoRecebimento}
              onChange={(e) => setPrazoRecebimento(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox id="recebidoVenda" checked={recebido} onCheckedChange={(v) => setRecebido(v === true)} />
            <Label htmlFor="recebidoVenda">Recebido</Label>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox id="aRendimentoVenda" checked={aRendimento} onCheckedChange={(v) => setARendimento(v === true)} />
            <Label
              htmlFor="aRendimentoVenda"
              title="Valor ainda é previsão — o definitivo entra depois, quando for conhecido."
            >
              A rendimento
            </Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelVenda">Responsável</Label>
            <Input
              id="responsavelVenda"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <Label htmlFor="observacoesVenda">Observações</Label>
            <Textarea
              id="observacoesVenda"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="h-9 min-h-9 resize-none"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_15rem_minmax(0,1fr)]">
        <CardSelecaoAnimais
          animais={animais}
          especie={especie}
          onTrocarEspecie={trocarEspecie}
          especieTravada={itens.length > 0}
          marcados={marcados}
          onMarcadosChange={setMarcados}
          idsIndisponiveis={idsNaVenda}
          rotuloIndisponivel="Na venda"
        />

        {/* Entre os cards: preço, peso e adicionar */}
        <div className="flex flex-col gap-4 self-start rounded-xl border bg-muted/30 p-4 xl:sticky xl:top-4 xl:mt-16">
          <div className="flex flex-col gap-2">
            <Label>Preço</Label>
            <div className="grid grid-cols-2 gap-1">
              {(["kg", "cabeca"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModoPreco(m)}
                  className={cn(buttonVariants({ variant: modoPreco === m ? "secondary" : "outline", size: "sm" }))}
                >
                  {m === "kg" ? "Por kg" : "Por cabeça"}
                </button>
              ))}
            </div>
            <CampoValorReais
              value={preco}
              onChange={setPreco}
              placeholder={modoPreco === "kg" ? "R$ / kg" : "R$ / cabeça"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pesoVenda">Peso</Label>
            <div className="grid grid-cols-2 gap-1">
              {(["lote", "individual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModoPeso(m)}
                  className={cn(buttonVariants({ variant: modoPeso === m ? "secondary" : "outline", size: "sm" }))}
                >
                  {m === "lote" ? "Do lote" : qtdMarcados > 1 ? "Médio" : "Individual"}
                </button>
              ))}
            </div>
            <Input
              id="pesoVenda"
              type="number"
              step="0.1"
              min="0"
              placeholder={rotuloPeso}
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              className="text-right tabular-nums"
            />
            {modoPreco === "kg" && !numero(peso) && qtdMarcados > 0 && (
              <p className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlert className="mt-0.5 size-3 shrink-0" />
                Preço por kg sem peso: o valor ficará em branco.
              </p>
            )}
          </div>

          <Button disabled={qtdMarcados === 0} onClick={adicionar}>
            Adicionar {qtdMarcados > 0 ? `(${qtdMarcados})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Card 2: animais da venda */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Animais da venda</CardTitle>
            <CardDescription>
              {resumo.quantidade} animal(is) em {itens.length} lançamento(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itens.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Marque animais à esquerda, informe preço e peso e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Animal / lote</TableHead>
                      <TableHead className="text-right">Peso</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => {
                      const n = item.animais.length;
                      const valor = valorPorAnimal(item);
                      const precoTexto =
                        item.preco == null
                          ? "—"
                          : `${formatarReais(item.preco)}/${item.modoPreco === "kg" ? "kg" : "cab"}`;
                      const botaoRemover = (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            title="Tirar da venda"
                            onClick={() => removerItem(item.chave)}
                          >
                            <X className="size-4" />
                          </Button>
                        </TableCell>
                      );

                      if (n === 1) {
                        const a = item.animais[0];
                        return (
                          <TableRow key={item.chave}>
                            <TableCell>
                              <div className="font-medium">{identificacao(a)}</div>
                              <div className="text-xs text-muted-foreground">
                                {a.categoria_descricao} · {a.area_nome}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatarKg(item.pesoPorAnimal)}</TableCell>
                            <TableCell className="text-right tabular-nums">{precoTexto}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatarReais(valor)}</TableCell>
                            {botaoRemover}
                          </TableRow>
                        );
                      }

                      const aberto = itensAbertos.has(item.chave);
                      const pesoTotal = item.pesoPorAnimal != null ? item.pesoPorAnimal * n : null;
                      return (
                        <Fragment key={item.chave}>
                          <TableRow className="bg-muted/30">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => alternarItemAberto(item.chave)}
                                className="flex items-start gap-1 text-left"
                              >
                                {aberto ? (
                                  <ChevronDown className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="mt-0.5 size-4 shrink-0" />
                                )}
                                <span>
                                  <span className="font-medium">
                                    {item.modoPeso === "lote" ? "Lote" : "Grupo"} · {n} animais
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    {item.modoPeso === "lote"
                                      ? `Peso do lote ${formatarKg(pesoTotal)} · médio ${formatarKg(item.pesoPorAnimal)}`
                                      : `Peso médio ${formatarKg(item.pesoPorAnimal)} · total ${formatarKg(pesoTotal)}`}
                                  </span>
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatarKg(pesoTotal)}</TableCell>
                            <TableCell className="text-right tabular-nums">{precoTexto}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatarReais(valor != null ? valor * n : null)}
                            </TableCell>
                            {botaoRemover}
                          </TableRow>
                          {aberto &&
                            item.animais.map((a) => (
                              <TableRow key={a.id} className="text-muted-foreground">
                                <TableCell className="pl-8">
                                  {identificacao(a)}
                                  <span className="text-xs"> · {a.categoria_descricao}</span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatarKg(item.pesoPorAnimal)}
                                </TableCell>
                                <TableCell />
                                <TableCell className="text-right tabular-nums">{formatarReais(valor)}</TableCell>
                                <TableCell />
                              </TableRow>
                            ))}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { rotulo: "Animais", valor: String(resumo.quantidade) },
          { rotulo: "Peso médio", valor: formatarKg(resumo.pesoMedio) },
          { rotulo: "Preço médio do kg", valor: formatarReais(resumo.precoMedioKg) },
          { rotulo: "Preço médio por cabeça", valor: formatarReais(resumo.precoMedioCabeca) },
          { rotulo: "Valor total", valor: formatarReais(resumo.valorTotal) },
        ].map((r) => (
          <div key={r.rotulo} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{r.rotulo}</div>
            <div className="text-lg font-semibold tabular-nums">{r.valor}</div>
          </div>
        ))}
      </div>
      {resumo.semValor > 0 && (
        <p className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400">
          <TriangleAlert className="size-4" />
          {resumo.semValor} animal(is) sem valor — dá pra definir o valor total da venda depois, no histórico.
        </p>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button size="lg" className="h-12 text-base" disabled={itens.length === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Registrando venda..." : `Finalizar venda (${resumo.quantidade} animais)`}
      </Button>
    </div>
  );
}
