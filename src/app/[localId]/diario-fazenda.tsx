"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Scale,
  Stethoscope,
  HeartCrack,
  Utensils,
  Scissors,
  CirclePlus,
  CircleMinus,
  ShieldAlert,
  Tags,
  Baby,
  Heart,
  CalendarCheck,
  Tag,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  MapPin,
  History,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buscarDiario, type EventoDiario, type TipoEventoDiario } from "@/lib/actions/diario";

const DIAS_POR_PAGINA = 30;

type Familia = "saida" | "entrada" | "dinheiro" | "reproducao" | "padrao";

const tipos: Record<TipoEventoDiario, { rotulo: string; icone: LucideIcon; familia: Familia }> = {
  movimentacao: { rotulo: "Movimentação", icone: ArrowLeftRight, familia: "padrao" },
  pesagem: { rotulo: "Pesagem", icone: Scale, familia: "padrao" },
  manejo_sanitario: { rotulo: "Manejo sanitário", icone: Stethoscope, familia: "padrao" },
  morte: { rotulo: "Morte", icone: HeartCrack, familia: "saida" },
  consumo: { rotulo: "Consumo interno", icone: Utensils, familia: "saida" },
  castracao: { rotulo: "Castração", icone: Scissors, familia: "padrao" },
  ajuste_entrada: { rotulo: "Ajuste de entrada", icone: CirclePlus, familia: "entrada" },
  ajuste_saida: { rotulo: "Ajuste de saída", icone: CircleMinus, familia: "saida" },
  furto: { rotulo: "Roubo ou furto", icone: ShieldAlert, familia: "saida" },
  troca_categoria: { rotulo: "Troca de categoria", icone: Tags, familia: "padrao" },
  nascimento: { rotulo: "Nascimento", icone: Baby, familia: "entrada" },
  cobertura: { rotulo: "Cobertura", icone: Heart, familia: "reproducao" },
  diagnostico_gestacao: { rotulo: "Diagnóstico de gestação", icone: CalendarCheck, familia: "reproducao" },
  venda: { rotulo: "Venda", icone: Tag, familia: "dinheiro" },
  compra: { rotulo: "Compra", icone: ShoppingCart, familia: "dinheiro" },
  transferencia_saida: { rotulo: "Transferência enviada", icone: ArrowUpRight, familia: "saida" },
  transferencia_entrada: { rotulo: "Transferência recebida", icone: ArrowDownLeft, familia: "entrada" },
  outro: { rotulo: "Registro", icone: FileText, familia: "padrao" },
};

// Mesma lógica de cores do app: saída de animal em vermelho, entrada em
// verde, dinheiro em âmbar, reprodução em roxo, o resto na cor padrão.
const coresFamilia: Record<Familia, string> = {
  saida: "bg-red-500/15 text-red-600 dark:text-red-400",
  entrada: "bg-green-500/15 text-green-600 dark:text-green-400",
  dinheiro: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  reproducao: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  padrao: "bg-primary/10 text-primary",
};

const diasSemana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function formatarDiaExtenso(data: string) {
  const d = new Date(data + "T00:00:00");
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return `${diasSemana[d.getDay()]}, ${dia}`;
}

function descreverTempoDecorrido(data: string) {
  const d = new Date(data + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias = Math.round((hoje.getTime() - d.getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CartaoEvento({ evento }: { evento: EventoDiario }) {
  const info = tipos[evento.tipo] ?? tipos.outro;
  const Icone = info.icone;
  const rodape = [evento.responsavel && `por ${evento.responsavel}`, evento.valor !== null && formatarReais(evento.valor)]
    .filter(Boolean)
    .join("  •  ");

  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${coresFamilia[info.familia]}`}>
        <Icone className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium">{info.rotulo}</span>
          {evento.total_animais > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {evento.total_animais === 1 ? "1 animal" : `${evento.total_animais} animais`}
            </span>
          )}
        </div>
        {evento.detalhe && <span className="text-sm">{evento.detalhe}</span>}
        {evento.area_detalhe && (
          <span className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3 shrink-0" />
            <span className="whitespace-pre-line">{evento.area_detalhe}</span>
          </span>
        )}
        {/* O que a pessoa escreveu na hora, em itálico pra não se confundir com o resumo automático. */}
        {evento.descricao && <span className="text-xs italic text-muted-foreground">{evento.descricao}</span>}
        {rodape && <span className="mt-1 text-xs text-muted-foreground">{rodape}</span>}
      </div>
    </div>
  );
}

type Props = {
  localId: string;
  eventosIniciais: EventoDiario[];
  erroInicial?: string | null;
};

export function DiarioFazenda({ localId, eventosIniciais, erroInicial = null }: Props) {
  const [eventos, setEventos] = useState(eventosIniciais);
  const [dias, setDias] = useState(DIAS_POR_PAGINA);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(erroInicial);

  async function carregarMais() {
    const novosDias = dias + DIAS_POR_PAGINA;
    setCarregando(true);
    setErro(null);
    const resultado = await buscarDiario(localId, novosDias);
    setCarregando(false);
    if ("error" in resultado) {
      setErro(resultado.error);
      return;
    }
    setEventos(resultado.eventos);
    setDias(novosDias);
  }

  // A lista já vem ordenada da RPC; só quebra em dias preservando a ordem.
  const porDia = useMemo(() => {
    const grupos: { data: string; eventos: EventoDiario[] }[] = [];
    for (const e of eventos) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.data === e.data) ultimo.eventos.push(e);
      else grupos.push({ data: e.data, eventos: [e] });
    }
    return grupos;
  }, [eventos]);

  return (
    <div className="flex flex-col gap-4">
      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {porDia.length === 0 && !erro ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nada registrado nos últimos {dias} dias.</p>
      ) : (
        porDia.map((dia) => (
          <section key={dia.data} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold capitalize text-primary">{formatarDiaExtenso(dia.data)}</h3>
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{descreverTempoDecorrido(dia.data)}</span>
            </div>
            {dia.eventos.map((e, i) => (
              <CartaoEvento key={`${e.referencia_id ?? e.tipo}-${i}`} evento={e} />
            ))}
          </section>
        ))
      )}

      <div className="flex flex-col items-center gap-1">
        <Button variant="ghost" size="sm" disabled={carregando} onClick={carregarMais}>
          <History className="size-4" />
          {carregando ? "Carregando..." : `Ver mais ${DIAS_POR_PAGINA} dias`}
        </Button>
        <span className="text-xs text-muted-foreground">Mostrando os últimos {dias} dias</span>
      </div>
    </div>
  );
}
