"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FolderTree, Plus, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  buscarGrupos,
  salvarGrupos,
  type EspecieGrupo,
  type ItemAgrupavel,
  type TipoGrupo,
} from "@/lib/actions/grupos";
import { cn } from "@/lib/utils";

const ESPECIES: { value: EspecieGrupo; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

const SEM_GRUPO = "__sem_grupo__";

type GrupoTela = { chave: string; id: string | null; nome: string; especie: EspecieGrupo | null };

const textos = {
  categoria: {
    titulo: "Grupos de categorias",
    descricao: "Dividem o Resumo de Movimentações. A ordem aqui é a ordem dos blocos no relatório.",
    item: "Categoria",
  },
  area: {
    titulo: "Grupos de áreas",
    descricao: "Dividem a Lotação por Área. A ordem aqui é a ordem dos blocos no relatório.",
    item: "Área",
  },
};

// Botão + diálogo. Usado nas telas de Categorias, Áreas e Relatórios.
export function BotaoGrupos({ localId, tipo, className }: { localId: string; tipo: TipoGrupo; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const [versao, setVersao] = useState(0);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={() => {
          setVersao((v) => v + 1);
          setAberto(true);
        }}
      >
        <FolderTree className="size-4" />
        {tipo === "categoria" ? "Grupos de categorias" : "Grupos de áreas"}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{textos[tipo].titulo}</DialogTitle>
            <DialogDescription>{textos[tipo].descricao}</DialogDescription>
          </DialogHeader>
          {/* A key fica no conteúdo, nunca no DialogContent. */}
          {aberto && <ConteudoGrupos key={versao} localId={localId} tipo={tipo} onFechar={() => setAberto(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConteudoGrupos({ localId, tipo, onFechar }: { localId: string; tipo: TipoGrupo; onFechar: () => void }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [especie, setEspecie] = useState<EspecieGrupo>("bovino");
  const [grupos, setGrupos] = useState<GrupoTela[]>([]);
  const [itens, setItens] = useState<ItemAgrupavel[]>([]);
  const [vinculo, setVinculo] = useState<Map<string, string | null>>(new Map());
  const [novoNome, setNovoNome] = useState("");

  useEffect(() => {
    let vivo = true;
    buscarGrupos(localId, tipo).then((r) => {
      if (!vivo) return;
      setCarregando(false);
      if ("error" in r) return setErro(r.error);
      setGrupos(r.grupos.map((g) => ({ chave: g.id, id: g.id, nome: g.nome, especie: g.especie })));
      setItens(r.itens);
      setVinculo(new Map(r.itens.map((i) => [i.id, i.grupo_id])));
    });
    return () => {
      vivo = false;
    };
  }, [localId, tipo]);

  const daVez = (e: EspecieGrupo | null) => (tipo === "categoria" ? e === especie : true);
  const gruposVisiveis = grupos.filter((g) => daVez(g.especie));
  const itensVisiveis = itens.filter((i) => daVez(i.especie));

  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const [, chave] of vinculo) if (chave) m.set(chave, (m.get(chave) ?? 0) + 1);
    return m;
  }, [vinculo]);

  function mover(chave: string, delta: number) {
    // Move dentro da lista visível (a da espécie), mantendo as outras no lugar.
    const visiveis = gruposVisiveis.map((g) => g.chave);
    const i = visiveis.indexOf(chave);
    const j = i + delta;
    if (j < 0 || j >= visiveis.length) return;
    [visiveis[i], visiveis[j]] = [visiveis[j], visiveis[i]];
    const porChave = new Map(grupos.map((g) => [g.chave, g]));
    const outros = grupos.filter((g) => !daVez(g.especie));
    setGrupos([...outros, ...visiveis.map((c) => porChave.get(c)!)]);
  }

  function renomear(chave: string, nome: string) {
    setGrupos((gs) => gs.map((g) => (g.chave === chave ? { ...g, nome } : g)));
  }

  function remover(chave: string) {
    const g = grupos.find((x) => x.chave === chave);
    const n = contagem.get(chave) ?? 0;
    if (n > 0 && !confirm(`Remover o grupo "${g?.nome}"? ${n} item(ns) ficam sem grupo.`)) return;
    setGrupos((gs) => gs.filter((x) => x.chave !== chave));
    setVinculo((v) => new Map(Array.from(v, ([item, c]) => [item, c === chave ? null : c])));
  }

  function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return;
    if (gruposVisiveis.some((g) => g.nome.trim().toLowerCase() === nome.toLowerCase())) {
      setErro(`Já existe o grupo "${nome}".`);
      return;
    }
    setErro(null);
    setGrupos((gs) => [
      ...gs,
      { chave: `novo-${crypto.randomUUID()}`, id: null, nome, especie: tipo === "categoria" ? especie : null },
    ]);
    setNovoNome("");
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const lotes: (EspecieGrupo | null)[] = tipo === "categoria" ? ESPECIES.map((e) => e.value) : [null];
      for (const e of lotes) {
        const doLote = (x: { especie: EspecieGrupo | null }) => tipo !== "categoria" || x.especie === e;
        const r = await salvarGrupos(
          localId,
          tipo,
          e,
          grupos.filter(doLote).map((g) => ({ chave: g.chave, id: g.id, nome: g.nome })),
          itens.filter(doLote).map((i) => ({ itemId: i.id, chave: vinculo.get(i.id) ?? null })),
        );
        if (r.error) {
          setErro(r.error);
          return;
        }
      }
      router.refresh();
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const opcoesGrupo = [
    { value: SEM_GRUPO, label: "Sem grupo" },
    ...gruposVisiveis.map((g) => ({ value: g.chave, label: g.nome.trim() || "(sem nome)" })),
  ];

  return (
    <div className="flex flex-col gap-4">
      {tipo === "categoria" && (
        <div className="flex flex-wrap gap-1">
          {ESPECIES.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => setEspecie(e.value)}
              className={cn(buttonVariants({ variant: especie === e.value ? "secondary" : "ghost", size: "sm" }))}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Grupos, na ordem do relatório</p>
          {gruposVisiveis.length === 0 && <p className="text-sm text-muted-foreground">Nenhum grupo ainda.</p>}
          {gruposVisiveis.map((g, i) => (
            <div key={g.chave} className="flex items-center gap-1">
              <Input value={g.nome} onChange={(e) => renomear(g.chave, e.target.value)} className="h-8" />
              <span className="w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums" title="Itens no grupo">
                {contagem.get(g.chave) ?? 0}
              </span>
              <Button variant="ghost" size="icon" className="size-7" disabled={i === 0} onClick={() => mover(g.chave, -1)} title="Subir">
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={i === gruposVisiveis.length - 1}
                onClick={() => mover(g.chave, 1)}
                title="Descer"
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => remover(g.chave)} title="Remover">
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-1 pt-1">
            <Input
              placeholder="Novo grupo"
              value={novoNome}
              className="h-8"
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionar();
                }
              }}
            />
            <Button size="sm" variant="outline" onClick={adicionar} disabled={!novoNome.trim()}>
              <Plus className="size-4" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {textos[tipo].item} → grupo
          </p>
          {itensVisiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada cadastrado.</p>
          ) : (
            <div className="flex max-h-[50vh] flex-col divide-y overflow-y-auto rounded-md border">
              {itensVisiveis.map((item) => {
                const atual = vinculo.get(item.id) ?? null;
                return (
                  <div key={item.id} className="flex items-center gap-2 px-2 py-1">
                    <span className={cn("min-w-0 flex-1 truncate text-sm", !item.ativo && "text-muted-foreground")}>
                      {item.nome}
                      {!item.ativo && " (inativa)"}
                    </span>
                    <Select
                      value={atual ?? SEM_GRUPO}
                      onValueChange={(v) =>
                        setVinculo((m) => new Map(m).set(item.id, !v || v === SEM_GRUPO ? null : (v as string)))
                      }
                      items={opcoesGrupo}
                    >
                      <SelectTrigger size="sm" className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {opcoesGrupo.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onFechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar grupos"}
        </Button>
      </DialogFooter>
    </div>
  );
}
