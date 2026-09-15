"use client";

import { Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Resumo do que some junto ao apagar uma estação ou um evento reprodutivo —
// vem das RPCs resumo_estacao_para_exclusao / resumo_evento_para_exclusao.
// `nascidos > 0` bloqueia a exclusão (apagar apagaria a origem do animal).
export type ResumoExclusaoReprodutiva = {
  eventos: number;
  coberturas: number;
  coberturas_confirmadas: number;
  diagnosticos: number;
  nascidos: number;
  doses_devolvidas: number;
};

function oQueSome(r: ResumoExclusaoReprodutiva) {
  const itens: string[] = [];
  if (r.eventos > 0) itens.push(`${r.eventos} ${r.eventos === 1 ? "evento" : "eventos"}`);
  if (r.coberturas > 0) {
    const confirmadas =
      r.coberturas_confirmadas > 0
        ? ` (${r.coberturas_confirmadas} confirmada${r.coberturas_confirmadas === 1 ? "" : "s"})`
        : "";
    itens.push(`${r.coberturas} ${r.coberturas === 1 ? "cobertura" : "coberturas"}${confirmadas}`);
  }
  if (r.diagnosticos > 0) {
    itens.push(`${r.diagnosticos} ${r.diagnosticos === 1 ? "diagnóstico" : "diagnósticos"} de gestação`);
  }
  return itens;
}

// Não pergunta "tem certeza?" e pronto: mostra o que exatamente vai junto
// (apagar uma estação leva eventos/coberturas/diagnósticos, nada disso
// volta). Quando há animal nascido, nem pergunta — explica por que não dá.
export function DialogoApagarReprodutivo({
  titulo,
  nome,
  resumo,
  emAndamento,
  onConfirmar,
  onFechar,
}: {
  titulo: string;
  nome: string;
  resumo: ResumoExclusaoReprodutiva | null;
  emAndamento?: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
}) {
  const bloqueado = (resumo?.nascidos ?? 0) > 0;
  const itens = resumo ? oQueSome(resumo) : [];

  return (
    <Dialog open={resumo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        {resumo && bloqueado ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Ban className="size-5" />
                Não dá pra apagar
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              &quot;{nome}&quot; tem {resumo.nascidos} {resumo.nascidos === 1 ? "animal nascido" : "animais nascidos"}{" "}
              de coberturas registradas aqui. Apagar apagaria a origem {resumo.nascidos === 1 ? "dele" : "deles"} —
              de que cobertura e de que touro {resumo.nascidos === 1 ? "veio" : "vieram"}. Se for mesmo pra apagar,
              os animais precisam sair antes.
            </p>
            <DialogFooter>
              <Button type="button" onClick={onFechar}>
                Entendi
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="size-5" />
                {titulo}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <p className="font-medium">&quot;{nome}&quot;</p>
              {itens.length > 0 && (
                <div>
                  <p className="text-muted-foreground">Vai junto:</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {itens.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {resumo && resumo.doses_devolvidas > 0 && (
                <p className="text-xs text-muted-foreground">
                  {resumo.doses_devolvidas} {resumo.doses_devolvidas === 1 ? "dose volta" : "doses voltam"} pro
                  banco de sêmen.
                </p>
              )}
              <p className="text-xs text-destructive">Não tem como desfazer.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onFechar} disabled={emAndamento}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={onConfirmar} disabled={emAndamento}>
                {emAndamento ? "Apagando..." : "Apagar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
