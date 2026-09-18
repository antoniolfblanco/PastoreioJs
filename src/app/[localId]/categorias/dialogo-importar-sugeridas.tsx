"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { importarCategoriasSugeridas } from "@/lib/actions/categorias";
import type { CategoriaIvz, CategoriaSugerida } from "./page";

const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "—" };

export function DialogoImportarSugeridas({
  localId,
  aberto,
  sugeridas,
  categoriasIvz,
  descricoesJaImportadas,
  onFechar,
}: {
  localId: string;
  aberto: boolean;
  sugeridas: CategoriaSugerida[];
  categoriasIvz: CategoriaIvz[];
  descricoesJaImportadas: Set<string>;
  onFechar: () => void;
}) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const nomesIvz = useMemo(
    () => new Map(categoriasIvz.map((c) => [c.id, c.nome])),
    [categoriasIvz],
  );

  // Compara por descrição, não por categoria_ivz_id: o IVZ é um código
  // oficial que várias sugestões podem compartilhar (ex.: "Potros",
  // "Potrancos" e "Cavalos Mansos" são todas "Equinos Machos +6 Meses" pro
  // IVZ) — comparar pelo código esconderia as outras assim que uma delas
  // fosse importada.
  const disponiveis = useMemo(
    () => sugeridas.filter((s) => !descricoesJaImportadas.has(s.descricao.trim().toLowerCase())),
    [sugeridas, descricoesJaImportadas],
  );

  function fechar(a: boolean) {
    if (a) return;
    setSelecionadas(new Set());
    setErro(undefined);
    onFechar();
  }

  function alternar(id: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function marcarTodas() {
    setSelecionadas(new Set(disponiveis.map((s) => s.id)));
  }

  function desmarcarTodas() {
    setSelecionadas(new Set());
  }

  async function confirmar() {
    setEmAndamento(true);
    setErro(undefined);
    try {
      const resultado = await importarCategoriasSugeridas(localId, Array.from(selecionadas));
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      fechar(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível importar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar categorias sugeridas</DialogTitle>
        </DialogHeader>

        {disponiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todas as categorias sugeridas pra essa espécie já foram importadas.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={marcarTodas}>
                Selecionar todas
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={desmarcarTodas}>
                Limpar seleção
              </Button>
              <span className="text-sm text-muted-foreground">{selecionadas.size} selecionada(s)</span>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left">
                    <th className="w-10 px-3 py-2">
                      <span className="sr-only">Selecionar</span>
                    </th>
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Categoria IVZ</th>
                    <th className="px-3 py-2 text-right font-medium">Sexo</th>
                  </tr>
                </thead>
                <tbody>
                  {disponiveis.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                      onClick={() => alternar(s.id)}
                    >
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selecionadas.has(s.id)}
                          onCheckedChange={() => alternar(s.id)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{s.descricao}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {nomesIvz.get(s.categoria_ivz_id) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {rotulosSexo[s.sexo] ?? s.sexo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <DialogFooter>
          <Button
            type="button"
            disabled={emAndamento || selecionadas.size === 0}
            onClick={confirmar}
          >
            {emAndamento ? "Importando..." : `Importar${selecionadas.size > 0 ? ` (${selecionadas.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
