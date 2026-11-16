"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { criarCiclo } from "@/lib/actions/ciclos";
import type { Ciclo } from "./page";

const especies = [
  { id: "bovino", rotulo: "Bovinos" },
  { id: "ovino", rotulo: "Ovinos" },
  { id: "equino", rotulo: "Equinos" },
] as const;

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "em aberto";
}

function reais(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Ciclos do local, como no app: o ativo em destaque e o "Novo ciclo", que
// encerra o atual (com estoque e valor finais) e abre o novo com o rebanho
// de agora como estoque inicial.
export function ListaCiclos({ localId, ciclos, podeEditar }: { localId: string; ciclos: Ciclo[]; podeEditar: boolean }) {
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const ativo = ciclos.find((c) => c.ativo) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Ciclos</h1>
          <p className="text-sm text-muted-foreground">
            O ciclo é o período em que o estoque de animais é acompanhado: começa com o rebanho do dia como estoque
            inicial e fecha com o estoque e o valor finais.
          </p>
        </div>
        {podeEditar && (
          <Button onClick={() => setDialogoAberto(true)}>
            <Plus className="size-4" />
            {ciclos.length === 0 ? "Cadastrar primeiro ciclo" : "Novo ciclo"}
          </Button>
        )}
      </div>

      {ciclos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <CalendarClock className="size-8" />
          <p>Nenhum ciclo cadastrado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ciclos.map((c) => {
            const linhas = especies
              .map((e) => ({
                ...e,
                inicial: c[`estoque_inicial_${e.id}`],
                final: c[`estoque_final_${e.id}`],
                valorInicial: c[`valor_inicial_${e.id}`],
                valorFinal: c[`valor_final_${e.id}`],
              }))
              .filter((l) => l.inicial || l.final || l.valorInicial || l.valorFinal);
            return (
              <div
                key={c.id}
                className={"flex flex-col gap-3 rounded-lg border p-4 " + (c.ativo ? "border-primary/40 bg-secondary/40" : "")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarClock className="size-4 text-muted-foreground" />
                  <span className="font-semibold">{c.nome}</span>
                  {c.ativo && <Badge>Ativo</Badge>}
                  <span className="text-sm text-muted-foreground">
                    {formatarData(c.data_inicio)} até {formatarData(c.data_fim)}
                  </span>
                </div>
                {linhas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Começou sem animais.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Espécie</TableHead>
                        <TableHead className="text-right">Estoque inicial</TableHead>
                        <TableHead className="text-right">Valor inicial</TableHead>
                        <TableHead className="text-right">Estoque final</TableHead>
                        <TableHead className="text-right">Valor final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>{l.rotulo}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.inicial}</TableCell>
                          <TableCell className="text-right tabular-nums">{reais(l.valorInicial)}</TableCell>
                          <TableCell className="text-right tabular-nums">{c.ativo ? "em andamento" : (l.final ?? "—")}</TableCell>
                          <TableCell className="text-right tabular-nums">{c.ativo ? "—" : reais(l.valorFinal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {podeEditar && (
        <Dialog open={dialogoAberto} onOpenChange={setDialogoAberto}>
          <DialogContent>
            {dialogoAberto && (
              <FormularioCiclo localId={localId} ativo={ativo} onFechar={() => setDialogoAberto(false)} />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Conteúdo do diálogo em componente próprio: monta a cada abertura, com o
// estado limpo (sem key no DialogContent — ver o bug do base-ui).
function FormularioCiclo({ localId, ativo, onFechar }: { localId: string; ativo: Ciclo | null; onFechar: () => void }) {
  const ano = new Date().getFullYear();
  const [nome, setNome] = useState(String(ativo ? ano + 1 : ano));
  const [inicio, setInicio] = useState(ativo ? hojeISO() : `${ano}-01-01`);
  const [confirmando, setConfirmando] = useState(false);
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) return setErro("Informe o nome do ciclo.");
    if (!inicio) return setErro("Informe o início do ciclo.");
    // Com ciclo ativo, pede confirmação antes de encerrá-lo (como no app).
    if (ativo && !confirmando) return setConfirmando(true);
    setEmAndamento(true);
    setErro(null);
    const r = await criarCiclo(localId, nome, inicio);
    setEmAndamento(false);
    if (r.error) {
      setConfirmando(false);
      return setErro(r.error);
    }
    toast.success(`Ciclo ${nome.trim()} criado.`);
    onFechar();
  }

  const fimDoAtual = (() => {
    if (!inicio) return null;
    const d = new Date(inicio + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("pt-BR");
  })();

  return (
    <>
      <DialogHeader>
        <DialogTitle>{ativo ? "Novo ciclo" : "Primeiro ciclo"}</DialogTitle>
        <DialogDescription>
          O rebanho vivo de agora vira o estoque inicial do ciclo novo, com o valor de estoque atual de cada animal.
        </DialogDescription>
      </DialogHeader>
      {confirmando && ativo ? (
        <div className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <span className="font-medium">Encerrar o ciclo atual?</span>
          <span>
            Isso vai encerrar &quot;{ativo.nome}&quot; em {fimDoAtual}, guardando o estoque e o valor finais, e tornar
            &quot;{nome.trim()}&quot; o ciclo ativo a partir de {new Date(inicio + "T00:00:00").toLocaleDateString("pt-BR")}.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cicloNomeNovo">Nome</Label>
            <Input id="cicloNomeNovo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Safra 2026" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cicloInicioNovo">Início do ciclo</Label>
            <Input
              id="cicloInicioNovo"
              type="date"
              value={inicio}
              min={ativo ? ativo.data_inicio : undefined}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          {ativo && (
            <p className="text-xs text-muted-foreground">
              O ciclo atual ({ativo.nome}) será encerrado no dia anterior ao início deste.
            </p>
          )}
        </div>
      )}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={() => (confirmando ? setConfirmando(false) : onFechar())}>
          {confirmando ? "Voltar" : "Cancelar"}
        </Button>
        <Button disabled={emAndamento} onClick={salvar}>
          {emAndamento ? "Criando..." : confirmando ? "Confirmar" : "Criar ciclo"}
        </Button>
      </DialogFooter>
    </>
  );
}
