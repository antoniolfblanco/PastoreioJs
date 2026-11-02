"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { CardSelecaoAnimais, identificacaoAnimal } from "@/components/card-selecao-animais";
import { moverAnimais } from "@/lib/actions/movimentacoes";
import type { AnimalMovimentacao, Especie, OpcaoArea } from "./page";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

// Cada item da lista vira uma movimentação ao finalizar: os animais marcados
// naquele momento indo pra uma área de destino.
type Movimento = {
  chave: number;
  animais: AnimalMovimentacao[];
  destinoId: string;
  destinoNome: string;
  data: string;
  descricao: string;
  responsavel: string;
};

// "Rodeio (12), Meio (3)" — de onde saem os animais de um movimento.
function resumoOrigens(animais: AnimalMovimentacao[]) {
  const contagem = new Map<string, number>();
  for (const a of animais) contagem.set(a.area_nome, (contagem.get(a.area_nome) ?? 0) + 1);
  return Array.from(contagem.entries())
    .map(([nome, qtd]) => `${nome} (${qtd})`)
    .join(", ");
}

export function NovaMovimentacao({
  localId,
  animais,
  areas,
}: {
  localId: string;
  animais: AnimalMovimentacao[];
  areas: OpcaoArea[];
}) {
  const [aberta, setAberta] = useState(false);

  const [especie, setEspecie] = useState<Especie>("bovino");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  // Card do meio
  const [data, setData] = useState(hojeISO);
  const [destinoId, setDestinoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");

  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());

  const [erroForm, setErroForm] = useState<string | undefined>();
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const idsNaLista = useMemo(() => new Set(movimentos.flatMap((m) => m.animais.map((a) => a.id))), [movimentos]);
  const totalAnimais = idsNaLista.size;
  const qtdMarcados = marcados.size;

  // Quantos já estão no destino escolhido — esses não precisam mover.
  const marcadosNoDestino = useMemo(
    () => animais.filter((a) => marcados.has(a.id) && a.area_id === destinoId).length,
    [animais, marcados, destinoId],
  );
  const rebanhoNoDestino = useMemo(
    () => animais.filter((a) => a.area_id === destinoId && a.especie === especie).length,
    [animais, destinoId, especie],
  );

  function trocarEspecie(nova: Especie) {
    setEspecie(nova);
    setMarcados(new Set());
  }

  function adicionar() {
    setErroForm(undefined);
    if (qtdMarcados === 0) return;
    if (!destinoId) return setErroForm("Selecione a área de destino.");
    if (!data) return setErroForm("Informe a data.");

    // Quem já está no destino fica de fora — mover pro mesmo lugar não faz nada.
    const selecionados = animais.filter((a) => marcados.has(a.id) && a.area_id !== destinoId);
    if (selecionados.length === 0) return setErroForm("Todos os marcados já estão nessa área.");

    setMovimentos((atual) => [
      ...atual,
      {
        chave: proximaChave,
        animais: selecionados,
        destinoId,
        destinoNome: areas.find((a) => a.id === destinoId)?.nome ?? "—",
        data,
        descricao,
        responsavel,
      },
    ]);
    setProximaChave((c) => c + 1);
    setMarcados(new Set());
    // O destino é limpo (o próximo lote costuma ir pra outra área); data,
    // descrição e responsável ficam.
    setDestinoId("");
  }

  function remover(chave: number) {
    setMovimentos((atual) => atual.filter((m) => m.chave !== chave));
  }

  function alternarAberto(chave: number) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function limparTudo() {
    setMarcados(new Set());
    setData(hojeISO());
    setDestinoId("");
    setDescricao("");
    setResponsavel("");
    setMovimentos([]);
    setAbertos(new Set());
    setErro(undefined);
    setErroForm(undefined);
  }

  function cancelar() {
    if (movimentos.length > 0 && !confirm("Descartar as movimentações da lista?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (movimentos.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);

    // Uma chamada por movimento. Se uma falhar, as já gravadas saem da lista.
    let gravados = 0;
    for (const m of movimentos) {
      const formData = new FormData();
      formData.set("localId", localId);
      formData.set("animalIds", JSON.stringify(m.animais.map((a) => a.id)));
      formData.set("areaDestinoId", m.destinoId);
      formData.set("data", m.data);
      formData.set("responsavel", m.responsavel);
      formData.set("descricao", m.descricao);

      const resultado = await moverAnimais(undefined, formData);
      if (resultado?.erro) {
        setMovimentos(movimentos.slice(gravados));
        setErro(
          (gravados > 0 ? `${gravados} movimentação(ões) registrada(s), mas a seguinte falhou. ` : "") + resultado.erro,
        );
        setEmAndamento(false);
        return;
      }
      gravados++;
    }

    setEmAndamento(false);
    toast.success(`${totalAnimais} animal(is) movido(s) em ${gravados} movimentação(ões).`);
    limparTudo();
    setAberta(false);
  }

  if (!aberta) {
    return (
      <div>
        <Button onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          Nova movimentação
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Movimentar animais</h2>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_17rem_minmax(0,1fr)]">
        <CardSelecaoAnimais
          animais={animais}
          especie={especie}
          onTrocarEspecie={trocarEspecie}
          especieTravada={movimentos.length > 0}
          marcados={marcados}
          onMarcadosChange={setMarcados}
          idsIndisponiveis={idsNaLista}
          rotuloIndisponivel="Na lista"
        />

        {/* Entre os cards: destino e dados da movimentação */}
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4 xl:sticky xl:top-4 xl:mt-16">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destinoMovimentacao">Área de destino</Label>
            <Select
              value={destinoId}
              onValueChange={(v) => setDestinoId(v ?? "")}
              items={areas.map((a) => ({ value: a.id, label: a.nome }))}
            >
              <SelectTrigger id="destinoMovimentacao" className="w-full">
                <SelectValue placeholder="Para onde vão" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {destinoId && (
              <span className="text-xs text-muted-foreground">
                Hoje com {rebanhoNoDestino} animal(is) desta espécie.
              </span>
            )}
            {marcadosNoDestino > 0 && (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {marcadosNoDestino} dos marcados já estão nessa área e ficam de fora.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataMovimentacao">Data</Label>
            <Input
              id="dataMovimentacao"
              type="date"
              max={hojeISO()}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoMovimentacao">Descrição</Label>
            <Input
              id="descricaoMovimentacao"
              placeholder="Ex.: Troca de potreiro pós-desmame"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelMovimentacao">Responsável</Label>
            <Input
              id="responsavelMovimentacao"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>

          {erroForm && <p className="text-sm text-destructive">{erroForm}</p>}

          <Button disabled={qtdMarcados === 0} onClick={adicionar}>
            Adicionar {qtdMarcados > 0 ? `(${qtdMarcados})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Lista das movimentações a registrar */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Movimentações a registrar</CardTitle>
            <CardDescription>
              {totalAnimais} animal(is) em {movimentos.length} movimentação(ões)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movimentos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Marque animais à esquerda, escolha o destino e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Movimentação</TableHead>
                      <TableHead className="text-right">Animais</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentos.map((m) => {
                      const aberto = abertos.has(m.chave);
                      const detalhes = [m.descricao || null, m.responsavel ? `por ${m.responsavel}` : null].filter(
                        Boolean,
                      );
                      return (
                        <Fragment key={m.chave}>
                          <TableRow className="bg-muted/30">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => alternarAberto(m.chave)}
                                className="flex items-start gap-1 text-left"
                              >
                                {aberto ? (
                                  <ChevronDown className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="mt-0.5 size-4 shrink-0" />
                                )}
                                <span className="flex flex-col gap-0.5">
                                  <span className="font-medium">
                                    {formatarData(m.data)} · para {m.destinoNome}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    De: {resumoOrigens(m.animais)}
                                  </span>
                                  {detalhes.length > 0 && (
                                    <span className="text-xs text-muted-foreground">{detalhes.join(" · ")}</span>
                                  )}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{m.animais.length}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                title="Tirar da lista"
                                onClick={() => remover(m.chave)}
                              >
                                <X className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {aberto &&
                            m.animais.map((a) => (
                              <TableRow key={a.id} className="text-muted-foreground">
                                <TableCell className="pl-8">
                                  {identificacaoAnimal(a)}
                                  <span className="text-xs">
                                    {" "}
                                    · {a.categoria_descricao} · de {a.area_nome}
                                  </span>
                                </TableCell>
                                <TableCell />
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

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button size="lg" className="h-12 text-base" disabled={movimentos.length === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Registrando..." : `Finalizar movimentações (${totalAnimais} animais)`}
      </Button>
    </div>
  );
}
