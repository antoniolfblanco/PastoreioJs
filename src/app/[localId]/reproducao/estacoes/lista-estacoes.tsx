"use client";

import { useMemo, useState, useActionState, useEffect } from "react";
import { Plus, Trash2, CalendarRange, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { FiltroMultiSelecao } from "@/components/filtro-multi-selecao";
import { cn } from "@/lib/utils";
import {
  salvarEstacaoReprodutiva,
  apagarEstacaoReprodutiva,
  buscarResumoEstacaoParaExclusao,
} from "@/lib/actions/estacoes-reprodutivas";
import { DialogoApagarReprodutivo, type ResumoExclusaoReprodutiva } from "../_componentes/dialogo-apagar-reprodutivo";
import type { Estacao, Especie } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

const rotulosStatus: Record<string, string> = { ativa: "Ativa", encerrada: "Encerrada" };

const hojeISO = new Date().toISOString().slice(0, 10);

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "Em aberto";
}

type ColunaId = "nome" | "inicio" | "fim" | "status";

const colunas: { id: ColunaId; rotulo: string }[] = [
  { id: "nome", rotulo: "Nome" },
  { id: "inicio", rotulo: "Início" },
  { id: "fim", rotulo: "Fim" },
  { id: "status", rotulo: "Status" },
];

function valorOrdenacao(e: Estacao, coluna: ColunaId): string | number {
  switch (coluna) {
    case "nome":
      return e.nome.toLowerCase();
    case "inicio":
      return e.data_inicio;
    case "fim":
      return e.data_fim ?? "9999-99-99";
    case "status":
      return e.ativo ? 0 : 1;
  }
}

type Props = {
  localId: string;
  estacoes: Estacao[];
  podeEditar: boolean;
};

export function ListaEstacoes({ localId, estacoes, podeEditar }: Props) {
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>("bovino");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({
    coluna: "inicio",
    desc: true,
  });
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [apagando, setApagando] = useState<{ estacao: Estacao; resumo: ResumoExclusaoReprodutiva } | null>(null);
  const [apagandoEmAndamento, setApagandoEmAndamento] = useState(false);

  // Estações antigas (criadas antes da separação por espécie) não têm
  // espécie definida — mostra elas em qualquer aba, já que podem se
  // referir a qualquer uma.
  const estacoesDaEspecie = useMemo(
    () => estacoes.filter((e) => e.especie === especieSelecionada || e.especie === null),
    [estacoes, especieSelecionada],
  );

  const estacaoAtivaDaEspecie = useMemo(
    () => estacoesDaEspecie.find((e) => e.ativo) ?? null,
    [estacoesDaEspecie],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    const filtrados = estacoesDaEspecie.filter((e) => {
      if (statusFiltro.size > 0 && !statusFiltro.has(e.ativo ? "ativa" : "encerrada")) return false;
      if (!buscaMin) return true;
      return e.nome.toLowerCase().includes(buscaMin);
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [estacoesDaEspecie, busca, statusFiltro, ordenacao]);

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (estacoes.find((e) => e.id === selecionadoId) ?? null);

  function novaEstacao() {
    if (estacaoAtivaDaEspecie) {
      const rotulo = especies.find((e) => e.value === especieSelecionada)?.rotulo ?? especieSelecionada;
      const confirmado = confirm(
        `Já existe uma estação ativa (${rotulo}): "${estacaoAtivaDaEspecie.nome}". Abrir uma nova vai encerrar ela. Confirma?`,
      );
      if (!confirmado) return;
    }
    setSelecionadoId("novo");
  }

  async function abrirExclusao(e: Estacao) {
    setCarregandoId(e.id);
    try {
      const resumo = await buscarResumoEstacaoParaExclusao(e.id);
      setApagando({ estacao: e, resumo });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível carregar a estação.");
    } finally {
      setCarregandoId(null);
    }
  }

  async function confirmarExclusao() {
    if (!apagando) return;
    setApagandoEmAndamento(true);
    try {
      await apagarEstacaoReprodutiva(localId, apagando.estacao.id);
      setApagando(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível apagar.");
    } finally {
      setApagandoEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Estação Reprodutiva</h1>
          <p className="text-sm text-muted-foreground">
            Períodos de monta/cobertura do rebanho — cada espécie tem sua própria estação ativa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {especies.map((e) => (
            <button
              key={e.value}
              onClick={() => setEspecieSelecionada(e.value)}
              className={cn(
                buttonVariants({ variant: especieSelecionada === e.value ? "secondary" : "ghost", size: "sm" }),
              )}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
      </div>

      {podeEditar && (
        <div>
          <Button size="sm" onClick={novaEstacao}>
            <Plus className="size-4" />
            Nova estação
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full md:max-w-64"
        />
        <FiltroMultiSelecao
          rotulo="Todos os status"
          className="w-full md:w-auto"
          selecionados={statusFiltro}
          onChange={setStatusFiltro}
          opcoes={Object.entries(rotulosStatus).map(([value, label]) => ({ value, label }))}
        />
        <span className="text-sm text-muted-foreground">{dados.length} estação(ões)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <CalendarRange className="size-8" />
          <p>Nenhuma estação reprodutiva encontrada.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((coluna) => (
                <TableHead key={coluna.id}>
                  <button
                    type="button"
                    onClick={() => ordenarPor(coluna.id)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {coluna.rotulo}
                    {ordenacao.coluna === coluna.id ? (
                      ordenacao.desc ? (
                        <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUp className="size-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                    )}
                  </button>
                </TableHead>
              ))}
              {podeEditar && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((e) => (
              <TableRow
                key={e.id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && setSelecionadoId(e.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {e.nome}
                    {e.especie === null && (
                      <Badge variant="outline" title="Criada antes da separação por espécie">
                        Legado
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatarData(e.data_inicio)}</TableCell>
                <TableCell>{formatarData(e.data_fim)}</TableCell>
                <TableCell>
                  <Badge variant={e.ativo ? "secondary" : "outline"}>{e.ativo ? "Ativa" : "Encerrada"}</Badge>
                </TableCell>
                {podeEditar && (
                  <TableCell onClick={(ev) => ev.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Apagar"
                      disabled={carregandoId === e.id}
                      onClick={() => abrirExclusao(e)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={colunas.length} className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "estação" : "estações"}
              </TableCell>
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoEstacao
          key={selecionadoId ?? "fechado"}
          localId={localId}
          especie={especieSelecionada}
          estacao={selecionado}
          onFechar={() => setSelecionadoId(null)}
        />
      )}

      <DialogoApagarReprodutivo
        titulo="Apagar esta estação?"
        nome={apagando?.estacao.nome ?? ""}
        resumo={apagando?.resumo ?? null}
        emAndamento={apagandoEmAndamento}
        onConfirmar={confirmarExclusao}
        onFechar={() => setApagando(null)}
      />
    </div>
  );
}

function DialogoEstacao({
  localId,
  especie,
  estacao,
  onFechar,
}: {
  localId: string;
  especie: Especie;
  estacao: Estacao | "novo" | null;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarEstacaoReprodutiva, undefined);
  const existente = estacao && estacao !== "novo" ? estacao : null;
  const [encerrada, setEncerrada] = useState(existente?.data_fim != null);
  const [dataFim, setDataFim] = useState(existente?.data_fim ?? hojeISO);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  const rotuloEspecie = especies.find((e) => e.value === especie)?.rotulo ?? especie;

  return (
    <Dialog open={estacao !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existente ? "Editar estação" : `Nova estação reprodutiva — ${rotuloEspecie}`}
          </DialogTitle>
        </DialogHeader>
        {estacao && (
          <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            {existente ? (
              <input type="hidden" name="id" value={existente.id} />
            ) : (
              <input type="hidden" name="especie" value={especie} />
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                required
                autoFocus
                placeholder={`Estação ${new Date().getFullYear()}`}
                defaultValue={existente?.nome ?? `Estação ${new Date().getFullYear()}`}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataInicio">Início da estação</Label>
              <Input
                id="dataInicio"
                name="dataInicio"
                type="date"
                required
                max={existente ? undefined : hojeISO}
                defaultValue={existente?.data_inicio ?? hojeISO}
              />
            </div>
            {existente && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="encerrada"
                    checked={encerrada}
                    onCheckedChange={(v) => {
                      const valor = v === true;
                      setEncerrada(valor);
                      if (valor && !dataFim) setDataFim(hojeISO);
                    }}
                  />
                  <Label htmlFor="encerrada">Estação encerrada</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {encerrada
                    ? "Encerrada; reabrir encerra a que estiver ativa nesta espécie."
                    : "Está aberta — é a estação ativa desta espécie."}
                </p>
                {encerrada && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="dataFim">Fim da estação</Label>
                    <Input
                      id="dataFim"
                      name="dataFim"
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Salvando..." : existente ? "Salvar" : "Abrir"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
