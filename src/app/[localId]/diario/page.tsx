import { buscarLocalAtual } from "@/lib/local";
import { buscarDiarioPeriodo } from "@/lib/actions/diario";
import { DiarioCompleto } from "./diario-completo";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DiarioPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  // Abre nos últimos 30 dias, como o diário da Início e do app.
  const ate = new Date();
  const de = new Date();
  de.setDate(de.getDate() - 30);
  const resultado = await buscarDiarioPeriodo(localId, iso(de), iso(ate));

  return (
    <DiarioCompleto
      localId={localId}
      localNome={local.nome}
      deInicial={iso(de)}
      ateInicial={iso(ate)}
      eventosIniciais={"eventos" in resultado ? resultado.eventos : []}
      erroInicial={"error" in resultado ? resultado.error : null}
    />
  );
}
