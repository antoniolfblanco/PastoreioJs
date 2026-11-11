"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDown, ArrowRight, BookOpen, Tag, HeartCrack } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buscarLotacaoAreas, buscarResumoMovimentacoes, type Especie } from "@/lib/actions/relatorios";
import { gerarPdfLotacao, gerarPdfMovimentacoes, rotulosEspecie } from "@/lib/relatorios-pdf";
import { hojeIso } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import type { AreaOpcao, CicloOpcao } from "./page";

const ESPECIES: Especie[] = ["bovino", "ovino", "equino"];

// Escolha de uma ou mais espécies (o app usa o mesmo seletor múltiplo).
function SeletorEspecies({ valor, onChange }: { valor: Set<Especie>; onChange: (v: Set<Especie>) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Espécies</Label>
      <div className="grid grid-cols-3 gap-1">
        {ESPECIES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => {
              const novo = new Set(valor);
              if (novo.has(e)) novo.delete(e);
              else novo.add(e);
              onChange(novo);
            }}
            className={cn(buttonVariants({ variant: valor.has(e) ? "secondary" : "outline", size: "sm" }))}
          >
            {rotulosEspecie[e]}
          </button>
        ))}
      </div>
    </div>
  );
}

function dataMaxima(ciclo: CicloOpcao | undefined) {
  const hoje = hojeIso();
  if (!ciclo?.data_fim) return hoje;
  return ciclo.data_fim < hoje ? ciclo.data_fim : hoje;
}

function ordenadas(especies: Set<Especie>) {
  return ESPECIES.filter((e) => especies.has(e));
}

function erroDe(e: unknown) {
  return "Não foi possível gerar o PDF: " + (e instanceof Error ? e.message : String(e));
}

function RelatorioMovimentacoes({ localId, localNome, ciclos }: { localId: string; localNome: string; ciclos: CicloOpcao[] }) {
  const inicial = ciclos.find((c) => c.ativo) ?? ciclos[0];
  const [cicloId, setCicloId] = useState(inicial?.id ?? "");
  const ciclo = ciclos.find((c) => c.id === cicloId);
  const [data, setData] = useState(dataMaxima(inicial));
  const [especies, setEspecies] = useState<Set<Especie>>(new Set(["bovino"]));
  const [mostrarVazias, setMostrarVazias] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function trocarCiclo(id: string) {
    setCicloId(id);
    const novo = ciclos.find((c) => c.id === id);
    const max = dataMaxima(novo);
    if (novo && (data < novo.data_inicio || data > max)) setData(max);
  }

  async function gerar() {
    if (!ciclo) return;
    setGerando(true);
    setErro(null);
    try {
      const r = await buscarResumoMovimentacoes(localId, ciclo.id, data, ordenadas(especies), mostrarVazias);
      if ("error" in r) return setErro(r.error);
      await gerarPdfMovimentacoes(localNome, r.cicloNome, data, r.especies);
    } catch (e) {
      setErro(erroDe(e));
    } finally {
      setGerando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumo de Movimentações</CardTitle>
        <CardDescription>
          Estoque inicial, entradas e saídas por categoria, do início do ciclo até a data escolhida, com a movimentação de
          valores.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SeletorEspecies valor={especies} onChange={setEspecies} />
        {ciclos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum ciclo cadastrado ainda.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Ciclo</Label>
              <Select
                value={cicloId}
                onValueChange={(v) => trocarCiclo(v ?? "")}
                items={ciclos.map((c) => ({ value: c.id, label: c.nome }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {ciclos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mov-data">Data do relatório</Label>
              <Input
                id="mov-data"
                type="date"
                value={data}
                min={ciclo?.data_inicio}
                max={dataMaxima(ciclo)}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <Checkbox id="mov-vazias" checked={mostrarVazias} onCheckedChange={(v) => setMostrarVazias(v === true)} />
          <Label htmlFor="mov-vazias">Mostrar categorias vazias</Label>
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Button disabled={gerando || !ciclo || especies.size === 0 || !data} onClick={gerar}>
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : "Gerar PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RelatorioLotacao({ localId, localNome, areas }: { localId: string; localNome: string; areas: AreaOpcao[] }) {
  const [especies, setEspecies] = useState<Set<Especie>>(new Set(["bovino"]));
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set(areas.map((a) => a.id)));
  const [mostrarVazias, setMostrarVazias] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    setGerando(true);
    setErro(null);
    try {
      const lista = ordenadas(especies);
      const r = await buscarLotacaoAreas(localId, lista, Array.from(selecionadas), mostrarVazias);
      if ("error" in r) return setErro(r.error);
      await gerarPdfLotacao(localNome, lista, r.areas);
    } catch (e) {
      setErro(erroDe(e));
    } finally {
      setGerando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lotação por Área</CardTitle>
        <CardDescription>Quantidade atual de animais por categoria em cada área. Uma foto de agora.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SeletorEspecies valor={especies} onChange={setEspecies} />
        <div className="flex items-center gap-2">
          <Checkbox id="lot-vazias" checked={mostrarVazias} onCheckedChange={(v) => setMostrarVazias(v === true)} />
          <Label htmlFor="lot-vazias">Mostrar áreas vazias</Label>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>
              Áreas ({selecionadas.size}/{areas.length})
            </Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setSelecionadas(new Set(areas.map((a) => a.id)))}>
                Todas
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelecionadas(new Set())}>
                Nenhuma
              </Button>
            </div>
          </div>
          {areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma área cadastrada ainda.</p>
          ) : (
            <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-md border p-2">
              {areas.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`lot-area-${a.id}`}
                    checked={selecionadas.has(a.id)}
                    onCheckedChange={(v) => {
                      const novo = new Set(selecionadas);
                      if (v === true) novo.add(a.id);
                      else novo.delete(a.id);
                      setSelecionadas(novo);
                    }}
                  />
                  <Label htmlFor={`lot-area-${a.id}`} className="font-normal">
                    {a.nome}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Button disabled={gerando || especies.size === 0 || selecionadas.size === 0} onClick={gerar}>
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : "Gerar PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Relatórios que saem de dentro de outra tela (o PDF é do que ela mostra).
function Atalho({
  href,
  icone: Icone,
  titulo,
  descricao,
}: {
  href: string;
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Icone className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{titulo}</span>
        <span className="text-xs text-muted-foreground">{descricao}</span>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function PainelRelatorios({
  localId,
  localNome,
  ciclos,
  areas,
}: {
  localId: string;
  localNome: string;
  ciclos: CicloOpcao[];
  areas: AreaOpcao[];
}) {
  const base = `/${localId}`;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Relatórios em PDF do rebanho.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RelatorioMovimentacoes localId={localId} localNome={localNome} ciclos={ciclos} />
        <RelatorioLotacao localId={localId} localNome={localNome} areas={areas} />
        <div className="flex flex-col gap-3">
          <Atalho
            href={`${base}/diario`}
            icone={BookOpen}
            titulo="Diário da fazenda"
            descricao="Escolha o período e os tipos de evento e gere o PDF."
          />
          <Atalho
            href={`${base}/vendas`}
            icone={Tag}
            titulo="PDF de Venda"
            descricao="Cada venda do histórico tem seu botão de PDF."
          />
          <Atalho
            href={`${base}/ocorrencias/mortes`}
            icone={HeartCrack}
            titulo="Mortes e Baixas"
            descricao="O PDF segue os filtros do histórico de mortes."
          />
        </div>
      </div>
    </div>
  );
}
