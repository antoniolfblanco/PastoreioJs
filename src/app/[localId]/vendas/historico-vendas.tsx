"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Calculator,
  ScaleIcon,
  Link2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CampoValorReais } from "@/components/campo-valor-reais";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  apagarVenda,
  definirValorTotalVenda,
  confirmarValorTotalVenda,
  agruparVendasCobranca,
  desagruparVendaCobranca,
  atualizarStatusVendaAnimal,
} from "@/lib/actions/vendas";
import { DialogoEditarVenda } from "./dialogo-editar-venda";
import type { AnimalDaVenda, Venda } from "./page";

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

function formatarReais(valor: number | null) {
  return valor != null ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
}

function valorAnimal(a: Venda["animais"][number]) {
  return a.valor_venda_definitivo ?? a.valor_venda_previsto;
}

function totalDaVenda(v: Venda) {
  return v.animais.reduce((s, a) => s + (valorAnimal(a) ?? 0), 0);
}

type ColunaId = "data" | "descricao" | "comprador" | "quantidade" | "valor" | "recebido";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "comprador", rotulo: "Comprador" },
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
  { id: "valor", rotulo: "Valor Total", alinhamento: "right" },
  { id: "recebido", rotulo: "Recebido" },
];

function valorOrdenacao(v: Venda, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return v.data;
    case "descricao":
      return (v.descricao ?? "").toLowerCase();
    case "comprador":
      return (v.comprador ?? "").toLowerCase();
    case "quantidade":
      return v.animais.length;
    case "valor":
      return totalDaVenda(v);
    case "recebido":
      return v.recebido ? 0 : 1;
  }
}

type Props = {
  localId: string;
  vendas: Venda[];
  podeEditar: boolean;
};

export function HistoricoVendas({ localId, vendas, podeEditar }: Props) {
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [aberto, setAberto] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [agrupando, setAgrupando] = useState(false);
  const [editando, setEditando] = useState<Venda | null>(null);
  const [definindoTotal, setDefinindoTotal] = useState<Venda | null>(null);
  const [confirmandoRendimento, setConfirmandoRendimento] = useState<Venda | null>(null);

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  function alternarExpandida(id: string) {
    setExpandidas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarSelecionada(id: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const dados = useMemo(() => {
    return [...vendas].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [vendas, ordenacao]);

  // Um cobranca_grupo_id só conta como "conjunto" se sobrar 2+ vendas com a
  // mesma tag na lista carregada — uma tag órfã (grupo desfeito até 1
  // sobrar) some sozinha da tela sem precisar de limpeza extra aqui.
  const vendasPorGrupo = useMemo(() => {
    const mapa = new Map<string, Venda[]>();
    for (const v of dados) {
      if (!v.cobranca_grupo_id) continue;
      const lista = mapa.get(v.cobranca_grupo_id) ?? [];
      lista.push(v);
      mapa.set(v.cobranca_grupo_id, lista);
    }
    for (const [grupoId, lista] of mapa) {
      if (lista.length < 2) mapa.delete(grupoId);
    }
    return mapa;
  }, [dados]);

  const totalAnimais = useMemo(() => dados.reduce((s, v) => s + v.animais.length, 0), [dados]);
  const totalValor = useMemo(() => dados.reduce((s, v) => s + totalDaVenda(v), 0), [dados]);

  async function excluir(venda: Venda) {
    if (
      !confirm(
        `Apagar a venda "${venda.descricao ?? formatarData(venda.data)}"? Os ${venda.animais.length} animal(is) voltam pro rebanho ativo.`,
      )
    )
      return;
    try {
      await apagarVenda(localId, venda.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  async function juntarEmCobranca() {
    const ids = Array.from(selecionadas);
    const compradores = new Set(dados.filter((v) => ids.includes(v.id)).map((v) => v.comprador ?? "—"));
    if (compradores.size > 1 && !confirm("As vendas selecionadas têm compradores diferentes — juntar mesmo assim?")) {
      return;
    }
    setAgrupando(true);
    try {
      await agruparVendasCobranca(localId, ids);
      setSelecionadas(new Set());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível juntar as vendas.");
    } finally {
      setAgrupando(false);
    }
  }

  async function tirarDaCobranca(venda: Venda) {
    try {
      await desagruparVendaCobranca(localId, venda.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível tirar da cobrança.");
    }
  }

  const gruposJaRenderizados = new Set<string>();

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setAberto((atual) => !atual)} className="flex items-center gap-2 text-left">
        {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <div>
          <h2 className="text-lg font-semibold">Histórico de vendas ({vendas.length})</h2>
          {!aberto && <p className="text-sm text-muted-foreground">Vendas já registradas — clique pra expandir.</p>}
        </div>
      </button>

      {aberto &&
        (dados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
            <DollarSign className="size-8" />
            <p>Nenhuma venda registrada ainda.</p>
          </div>
        ) : (
          <>
            {podeEditar && selecionadas.size >= 2 && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                <span className="text-sm text-muted-foreground">{selecionadas.size} vendas selecionadas</span>
                <Button size="sm" disabled={agrupando} onClick={juntarEmCobranca}>
                  <Link2 className="size-4" />
                  {agrupando ? "Juntando..." : "Juntar em uma cobrança"}
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  {podeEditar && <TableHead className="w-8" />}
                  <TableHead className="w-8" />
                  {colunas.map((coluna) => (
                    <TableHead key={coluna.id} className={coluna.alinhamento === "right" ? "text-right" : undefined}>
                      <button
                        type="button"
                        onClick={() => ordenarPor(coluna.id)}
                        className={`inline-flex items-center gap-1 hover:text-foreground ${
                          coluna.alinhamento === "right" ? "flex-row-reverse" : ""
                        }`}
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
                  {podeEditar && <TableHead className="w-44" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((v) => {
                  if (v.cobranca_grupo_id && vendasPorGrupo.has(v.cobranca_grupo_id)) {
                    if (gruposJaRenderizados.has(v.cobranca_grupo_id)) return null;
                    gruposJaRenderizados.add(v.cobranca_grupo_id);
                    const vendasDoGrupo = vendasPorGrupo.get(v.cobranca_grupo_id)!;
                    return (
                      <GrupoCobranca
                        key={v.cobranca_grupo_id}
                        localId={localId}
                        vendas={vendasDoGrupo}
                        podeEditar={podeEditar}
                        expandidas={expandidas}
                        selecionadas={selecionadas}
                        onAlternarExpandida={alternarExpandida}
                        onAlternarSelecionada={alternarSelecionada}
                        onEditar={setEditando}
                        onDefinirTotal={setDefinindoTotal}
                        onConfirmarRendimento={setConfirmandoRendimento}
                        onExcluir={excluir}
                        onTirarDaCobranca={tirarDaCobranca}
                      />
                    );
                  }
                  return (
                    <LinhaVenda
                      key={v.id}
                      localId={localId}
                      venda={v}
                      podeEditar={podeEditar}
                      expandida={expandidas.has(v.id)}
                      selecionada={selecionadas.has(v.id)}
                      estaAgrupada={false}
                      onAlternarExpandida={() => alternarExpandida(v.id)}
                      onAlternarSelecionada={() => alternarSelecionada(v.id)}
                      onEditar={() => setEditando(v)}
                      onDefinirTotal={() => setDefinindoTotal(v)}
                      onConfirmarRendimento={() => setConfirmandoRendimento(v)}
                      onExcluir={() => excluir(v)}
                      onTirarDaCobranca={() => tirarDaCobranca(v)}
                    />
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  {podeEditar && <TableCell />}
                  <TableCell />
                  <TableCell colSpan={3} className="text-sm font-normal text-muted-foreground">
                    {dados.length} {dados.length === 1 ? "venda" : "vendas"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{totalAnimais}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatarReais(totalValor)}</TableCell>
                  <TableCell />
                  {podeEditar && <TableCell />}
                </TableRow>
              </TableFooter>
            </Table>
          </>
        ))}

      {podeEditar && <DialogoEditarVenda localId={localId} venda={editando} onFechar={() => setEditando(null)} />}

      <DialogoValorTotal
        titulo="Definir valor total da venda"
        descricao="Rateia o valor entre todos os animais desta venda — por peso quando todos tiverem peso registrado, senão igual por cabeça."
        venda={definindoTotal}
        onFechar={() => setDefinindoTotal(null)}
        onConfirmar={(id, valor) => definirValorTotalVenda(localId, id, valor)}
      />

      <DialogoValorTotal
        titulo="Confirmar valor definitivo (a rendimento)"
        descricao="Rateia o valor só entre os animais a rendimento ainda pendentes, por peso de venda."
        venda={confirmandoRendimento}
        onFechar={() => setConfirmandoRendimento(null)}
        onConfirmar={(id, valor) => confirmarValorTotalVenda(localId, id, valor)}
      />
    </div>
  );
}

function GrupoCobranca({
  localId,
  vendas,
  podeEditar,
  expandidas,
  selecionadas,
  onAlternarExpandida,
  onAlternarSelecionada,
  onEditar,
  onDefinirTotal,
  onConfirmarRendimento,
  onExcluir,
  onTirarDaCobranca,
}: {
  localId: string;
  vendas: Venda[];
  podeEditar: boolean;
  expandidas: Set<string>;
  selecionadas: Set<string>;
  onAlternarExpandida: (id: string) => void;
  onAlternarSelecionada: (id: string) => void;
  onEditar: (v: Venda) => void;
  onDefinirTotal: (v: Venda) => void;
  onConfirmarRendimento: (v: Venda) => void;
  onExcluir: (v: Venda) => void;
  onTirarDaCobranca: (v: Venda) => void;
}) {
  const compradores = new Set(vendas.map((v) => v.comprador ?? "—"));
  const comprador = compradores.size === 1 ? [...compradores][0] : "Vários compradores";
  const total = vendas.reduce((s, v) => s + totalDaVenda(v), 0);
  const totalAnimais = vendas.reduce((s, v) => s + v.animais.length, 0);
  const todasRecebidas = vendas.every((v) => v.recebido);

  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={podeEditar ? 9 : 7} className="py-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link2 className="size-4 text-muted-foreground" />
            <span className="font-medium">Cobrança conjunta</span>
            <span className="text-muted-foreground">
              {comprador} — {vendas.length} lotes — {totalAnimais} animal(is)
            </span>
            <span className="font-medium tabular-nums">{formatarReais(total)}</span>
            <Badge variant={todasRecebidas ? "secondary" : "outline"}>
              {todasRecebidas ? "Recebido" : "Pendente"}
            </Badge>
          </div>
        </TableCell>
      </TableRow>
      {vendas.map((v) => (
        <LinhaVenda
          key={v.id}
          localId={localId}
          venda={v}
          podeEditar={podeEditar}
          expandida={expandidas.has(v.id)}
          selecionada={selecionadas.has(v.id)}
          estaAgrupada
          onAlternarExpandida={() => onAlternarExpandida(v.id)}
          onAlternarSelecionada={() => onAlternarSelecionada(v.id)}
          onEditar={() => onEditar(v)}
          onDefinirTotal={() => onDefinirTotal(v)}
          onConfirmarRendimento={() => onConfirmarRendimento(v)}
          onExcluir={() => onExcluir(v)}
          onTirarDaCobranca={() => onTirarDaCobranca(v)}
        />
      ))}
    </>
  );
}

function LinhaVenda({
  localId,
  venda: v,
  podeEditar,
  expandida,
  selecionada,
  estaAgrupada,
  onAlternarExpandida,
  onAlternarSelecionada,
  onEditar,
  onDefinirTotal,
  onConfirmarRendimento,
  onExcluir,
  onTirarDaCobranca,
}: {
  localId: string;
  venda: Venda;
  podeEditar: boolean;
  expandida: boolean;
  selecionada: boolean;
  estaAgrupada: boolean;
  onAlternarExpandida: () => void;
  onAlternarSelecionada: () => void;
  onEditar: () => void;
  onDefinirTotal: () => void;
  onConfirmarRendimento: () => void;
  onExcluir: () => void;
  onTirarDaCobranca: () => void;
}) {
  const valorTotalVenda = totalDaVenda(v);
  const temPendenteRendimento = v.animais.some((a) => a.a_rendimento && a.valor_venda_definitivo == null);

  return (
    <Fragment>
      <TableRow className={`cursor-pointer ${estaAgrupada ? "bg-muted/10" : ""}`} onClick={onAlternarExpandida}>
        {podeEditar && (
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selecionada} onCheckedChange={onAlternarSelecionada} />
          </TableCell>
        )}
        <TableCell>
          {expandida ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-medium">{formatarData(v.data)}</TableCell>
        <TableCell>{v.descricao ?? "—"}</TableCell>
        <TableCell>{v.comprador ?? "—"}</TableCell>
        <TableCell className="text-right tabular-nums">{v.animais.length}</TableCell>
        <TableCell className="text-right tabular-nums">{formatarReais(valorTotalVenda)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <Badge variant={v.recebido ? "secondary" : "outline"}>{v.recebido ? "Recebido" : "Pendente"}</Badge>
            {temPendenteRendimento && (
              <Badge variant="outline" title="Tem animal a rendimento aguardando valor definitivo">
                A rendimento
              </Badge>
            )}
          </div>
        </TableCell>
        {podeEditar && (
          <TableCell onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-7" title="Editar" onClick={onEditar}>
                <Pencil className="size-4" />
              </Button>
              {temPendenteRendimento && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="Confirmar valor definitivo (a rendimento)"
                  onClick={onConfirmarRendimento}
                >
                  <ScaleIcon className="size-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="size-7" title="Definir valor total (rateado)" onClick={onDefinirTotal}>
                <Calculator className="size-4" />
              </Button>
              {estaAgrupada && (
                <Button variant="ghost" size="icon" className="size-7" title="Tirar dessa cobrança" onClick={onTirarDaCobranca}>
                  <Unlink className="size-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="size-7 text-destructive" title="Apagar" onClick={onExcluir}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
      {expandida && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          {podeEditar && <TableCell />}
          <TableCell />
          <TableCell colSpan={podeEditar ? 7 : 6}>
            <div className="flex flex-col gap-2 py-1">
              {v.animais.map((a) => (
                <LinhaStatusAnimal key={a.id} localId={localId} animal={a} podeEditar={podeEditar} />
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

function LinhaStatusAnimal({
  localId,
  animal: a,
  podeEditar,
}: {
  localId: string;
  animal: AnimalDaVenda;
  podeEditar: boolean;
}) {
  const [emAndamento, setEmAndamento] = useState(false);

  async function alternar(campo: "paga" | "entregue" | "contratoAssinado" | "posseTransferida") {
    setEmAndamento(true);
    try {
      await atualizarStatusVendaAnimal(localId, a.id, {
        paga: campo === "paga" ? !a.venda_paga : a.venda_paga,
        entregue: campo === "entregue" ? !a.venda_entregue : a.venda_entregue,
        contratoAssinado: campo === "contratoAssinado" ? !a.venda_contrato_assinado : a.venda_contrato_assinado,
        posseTransferida: campo === "posseTransferida" ? !a.venda_posse_transferida : a.venda_posse_transferida,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
      <div className="flex flex-col">
        <span>
          {a.identificacao} <span className="text-xs text-muted-foreground">({a.categoria_descricao})</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {a.peso_venda != null && `${a.peso_venda} kg — `}
          {a.a_rendimento && "a rendimento — "}
          {formatarReais(valorAnimal(a))}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <CampoStatus
          rotulo="Pago"
          marcado={a.venda_paga}
          data={a.venda_data_pagamento}
          podeEditar={podeEditar}
          desabilitado={emAndamento}
          onToggle={() => alternar("paga")}
        />
        <CampoStatus
          rotulo="Entregue"
          marcado={a.venda_entregue}
          data={a.venda_data_entrega}
          podeEditar={podeEditar}
          desabilitado={emAndamento}
          onToggle={() => alternar("entregue")}
        />
        <CampoStatus
          rotulo="Contrato"
          marcado={a.venda_contrato_assinado}
          data={a.venda_data_contrato_assinado}
          podeEditar={podeEditar}
          desabilitado={emAndamento}
          onToggle={() => alternar("contratoAssinado")}
        />
        <CampoStatus
          rotulo="Transferida"
          marcado={a.venda_posse_transferida}
          data={a.venda_data_posse_transferida}
          podeEditar={podeEditar}
          desabilitado={emAndamento}
          onToggle={() => alternar("posseTransferida")}
        />
      </div>
    </div>
  );
}

function CampoStatus({
  rotulo,
  marcado,
  data,
  podeEditar,
  desabilitado,
  onToggle,
}: {
  rotulo: string;
  marcado: boolean;
  data: string | null;
  podeEditar: boolean;
  desabilitado: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
      title={marcado && data ? `${rotulo} em ${formatarData(data)}` : undefined}
    >
      <Checkbox checked={marcado} disabled={!podeEditar || desabilitado} onCheckedChange={onToggle} />
      {rotulo}
    </label>
  );
}

function DialogoValorTotal({
  titulo,
  descricao,
  venda,
  onFechar,
  onConfirmar,
}: {
  titulo: string;
  descricao: string;
  venda: Venda | null;
  onFechar: () => void;
  onConfirmar: (vendaId: string, valor: number) => Promise<void>;
}) {
  return (
    <Dialog open={venda !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent: remontar o Popup no
            meio da própria transição de fechamento fazia a janela "voltar"
            — reabrir sozinha assim que o usuário confirmava. */}
        {venda && (
          <ConteudoValorTotal
            key={venda.id}
            descricao={descricao}
            venda={venda}
            onFechar={onFechar}
            onConfirmar={onConfirmar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoValorTotal({
  descricao,
  venda,
  onFechar,
  onConfirmar,
}: {
  descricao: string;
  venda: Venda;
  onFechar: () => void;
  onConfirmar: (vendaId: string, valor: number) => Promise<void>;
}) {
  const [valor, setValor] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function confirmar() {
    const numero = Number(valor);
    if (!valor || Number.isNaN(numero) || numero < 0) {
      setErro("Informe um valor válido.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      await onConfirmar(venda.id, numero);
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{descricao}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="valorTotalVenda">Valor total (R$)</Label>
        <CampoValorReais value={valor} onChange={setValor} />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento} onClick={confirmar}>
          {emAndamento ? "Salvando..." : "Confirmar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
