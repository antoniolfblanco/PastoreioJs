"use client";

import { useMemo, useState } from "react";
import { FileDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiltroMultiSelecao } from "@/components/filtro-multi-selecao";
import { TabelaResumo, contar } from "@/components/tabela-resumo";
import { buscarDiarioPeriodo, type EventoDiario, type TipoEventoDiario } from "@/lib/actions/diario";
import { rotulosTipoDiario } from "@/lib/diario-tipos";
import { gerarPdfDiario } from "@/lib/relatorios-pdf";
import { DiasDoDiario } from "../diario-fazenda";

// O diário inteiro da fazenda, com período livre e filtro por tipo de
// evento — o mesmo conteúdo do card da Início (RPC diario_do_local), com
// resumo e PDF do recorte.
export function DiarioCompleto({
  localId,
  localNome,
  deInicial,
  ateInicial,
  eventosIniciais,
  erroInicial,
}: {
  localId: string;
  localNome: string;
  deInicial: string;
  ateInicial: string;
  eventosIniciais: EventoDiario[];
  erroInicial: string | null;
}) {
  const [de, setDe] = useState(deInicial);
  const [ate, setAte] = useState(ateInicial);
  // Período que está carregado (o dos campos pode ter sido mexido sem buscar).
  const [periodo, setPeriodo] = useState({ de: deInicial, ate: ateInicial });
  const [eventos, setEventos] = useState(eventosIniciais);
  const [tipos, setTipos] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(erroInicial);

  async function buscar() {
    setCarregando(true);
    setErro(null);
    const r = await buscarDiarioPeriodo(localId, de, ate);
    setCarregando(false);
    if ("error" in r) return setErro(r.error);
    setEventos(r.eventos);
    setPeriodo({ de, ate });
  }

  const tiposPresentes = useMemo(
    () =>
      Array.from(new Set(eventos.map((e) => e.tipo)))
        .map((t) => ({ value: t, label: rotulosTipoDiario[t] ?? "Registro" }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [eventos],
  );

  const filtrados = useMemo(
    () => (tipos.size === 0 ? eventos : eventos.filter((e) => tipos.has(e.tipo))),
    [eventos, tipos],
  );

  const resumoTipos = useMemo(
    () => contar(filtrados.map((e) => rotulosTipoDiario[e.tipo as TipoEventoDiario] ?? "Registro")),
    [filtrados],
  );
  const totalAnimais = filtrados.reduce((s, e) => s + e.total_animais, 0);

  async function pdf() {
    setGerando(true);
    setErro(null);
    try {
      const filtro =
        tipos.size === 0
          ? null
          : "Somente: " + Array.from(tipos).map((t) => rotulosTipoDiario[t as TipoEventoDiario]).join(", ");
      await gerarPdfDiario(localNome, periodo.de, periodo.ate, filtro, filtrados);
    } catch (e) {
      setErro("Não foi possível gerar o PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Diário da fazenda</h1>
          <p className="text-sm text-muted-foreground">Tudo que as rotinas registraram, dia a dia.</p>
        </div>
        <Button variant="outline" disabled={gerando || carregando} onClick={pdf}>
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : "Gerar PDF"}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="diario-de">De</Label>
          <Input id="diario-de" type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} className="w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="diario-ate">Até</Label>
          <Input id="diario-ate" type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} className="w-40" />
        </div>
        <Button disabled={carregando || !de || !ate} onClick={buscar}>
          <Search className="size-4" />
          {carregando ? "Buscando..." : "Buscar"}
        </Button>
        <FiltroMultiSelecao
          rotulo="Todos os tipos"
          className="w-full md:w-auto"
          selecionados={tipos}
          onChange={setTipos}
          opcoes={tiposPresentes}
        />
        <span className="text-sm text-muted-foreground">
          {filtrados.length} registro(s) • {totalAnimais} animal(is)
        </span>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          {filtrados.length === 0 ? (
            <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Nada registrado no período.
            </p>
          ) : (
            <DiasDoDiario eventos={filtrados} />
          )}
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <TabelaResumo titulo="Registros por tipo" linhas={resumoTipos} />
        </div>
      </div>
    </div>
  );
}
