"use client";

import { useEffect, useState } from "react";
import { FileDown, GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buscarGenealogia, type NoGenealogia } from "@/lib/actions/genealogia";
import { gerarPdfGenealogia, nomeAnimal, registroAnimal } from "@/lib/genealogia-pdf";
import { cn } from "@/lib/utils";

function dataBr(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

const corBorda = (n: NoGenealogia | null) =>
  !n
    ? "border-l-muted-foreground/30"
    : n.sexo === "macho"
      ? "border-l-teal-700 dark:border-l-teal-400"
      : n.sexo === "femea"
        ? "border-l-purple-600 dark:border-l-purple-400"
        : "border-l-muted-foreground/40";

// Botão "Genealogia" + popup com a árvore de 5 gerações e o PDF. Aparece
// para quem tem pai ou mãe cadastrado.
export function BotaoGenealogia({ animalId, localNome }: { animalId: string; localNome: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)}>
        <GitFork className="size-4 rotate-90" />
        Genealogia
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[94vh] overflow-auto sm:max-w-[min(96vw,80rem)]">
          <DialogHeader>
            <DialogTitle>Genealogia - 5ª geração</DialogTitle>
            <DialogDescription>Pai acima e mãe abaixo de cada animal, até os trisavós.</DialogDescription>
          </DialogHeader>
          {/* A key fica no conteúdo, nunca no DialogContent. */}
          {aberto && <ConteudoGenealogia key={animalId} animalId={animalId} localNome={localNome} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConteudoGenealogia({ animalId, localNome }: { animalId: string; localNome: string }) {
  const [nos, setNos] = useState<(NoGenealogia | null)[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    let vivo = true;
    buscarGenealogia(animalId).then((r) => {
      if (!vivo) return;
      if ("error" in r) setErro(r.error);
      else setNos(r.nos);
    });
    return () => {
      vivo = false;
    };
  }, [animalId]);

  async function pdf() {
    if (!nos) return;
    setGerando(true);
    try {
      await gerarPdfGenealogia(localNome, nos);
    } catch (e) {
      setErro("Não foi possível gerar o PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGerando(false);
    }
  }

  if (erro) return <p className="text-sm text-destructive">{erro}</p>;
  if (!nos) return <p className="text-sm text-muted-foreground">Carregando a genealogia...</p>;
  const animal = nos[0]!;

  // Grade de 16 linhas: geração g ocupa 16/2^g linhas por animal. Na 1ª
  // coluna o pai fica nas linhas 3-6, o animal em 7-10 e a mãe em 11-14
  // (centros alinhados com os avós ao lado).
  const quadros: React.ReactNode[] = [];
  for (let g = 1; g <= 4; g++) {
    const span = 16 / 2 ** g;
    for (let k = 0; k < 2 ** g; k++) {
      const n = nos[2 ** g - 1 + k];
      const filho = nos[2 ** (g - 1) - 1 + Math.floor(k / 2)];
      if (!n && !filho) continue;
      quadros.push(
        <div
          key={`${g}-${k}`}
          className="flex items-center"
          style={{ gridColumn: g, gridRow: g === 1 ? `${k * 8 + 3} / span 4` : `${k * span + 1} / span ${span}` }}
        >
          <Quadro no={n} pequeno={g >= 4} />
        </div>,
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={pdf} disabled={gerando}>
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : "Gerar PDF"}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[60rem] gap-x-4"
          style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gridTemplateRows: "repeat(16, minmax(2.6rem, auto))" }}
        >
          {quadros}
          {/* O animal: meio da 1ª coluna, entre o pai e a mãe. */}
          <div className="flex items-center" style={{ gridColumn: 1, gridRow: "7 / span 4" }}>
            <div className="w-full rounded-lg border-2 bg-card p-3 shadow-sm">
              <div className="text-xs text-muted-foreground">
                {animal.sexo === "macho" ? "♂ Macho" : animal.sexo === "femea" ? "♀ Fêmea" : "Sexo não informado"}
              </div>
              <div className="text-lg font-bold uppercase leading-tight">{nomeAnimal(animal)}</div>
              <div className="font-mono text-sm">
                {[animal.registro_definitivo, animal.registro_provisorio && `RP ${animal.registro_provisorio}`]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div className="text-xs text-muted-foreground">
                {[
                  animal.data_nascimento && `Nasc. ${dataBr(animal.data_nascimento)}`,
                  animal.raca,
                  animal.grau_sangue !== "Desconhecido" ? animal.grau_sangue : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {animal.pelagem && (
                <span className="mt-1.5 inline-block rounded-full border px-2 py-0.5 text-xs">{animal.pelagem}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Quadro({ no, pequeno }: { no: NoGenealogia | null; pequeno: boolean }) {
  return (
    <div
      className={cn(
        "w-full rounded-md border border-l-4 bg-card px-2",
        pequeno ? "py-1" : "py-1.5",
        corBorda(no),
        !no && "border-dashed",
      )}
    >
      {no ? (
        <>
          <div className={cn("truncate font-semibold uppercase", pequeno ? "text-[11px]" : "text-xs")}>{nomeAnimal(no)}</div>
          {registroAnimal(no) && (
            <div className="truncate font-mono text-[11px] text-blue-700 dark:text-blue-400">{registroAnimal(no)}</div>
          )}
          {no.pelagem && <div className="truncate text-[11px] text-amber-700 dark:text-amber-400">{no.pelagem}</div>}
        </>
      ) : (
        <div className="text-[11px] italic text-muted-foreground">Não informado</div>
      )}
    </div>
  );
}
