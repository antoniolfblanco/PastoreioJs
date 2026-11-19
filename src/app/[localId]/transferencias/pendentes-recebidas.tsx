"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { identificacaoAnimal } from "@/components/card-selecao-animais";
import { confirmarTransferencia, recusarTransferencia } from "@/lib/actions/transferencias";
import type { OpcaoArea, OpcaoCategoria, OpcaoRaca, Transferencia } from "./page";

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type Props = {
  localId: string;
  pendentes: Transferencia[];
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
};

// Transferências de outras fazendas do sistema aguardando este local
// confirmar (escolhendo área, categoria e raça do lote) ou recusar.
export function PendentesRecebidas({ localId, pendentes, areas, categorias, racas }: Props) {
  const [acao, setAcao] = useState<{ tipo: "confirmar" | "recusar"; transferencia: Transferencia } | null>(null);

  return (
    <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="size-5" />
          Transferências aguardando recebimento
        </CardTitle>
        <CardDescription>Confira os animais e confirme a entrada ou recuse a transferência.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {pendentes.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">
                {t.animais.length} animal(is) de {t.outroNome}
              </span>
              <span className="text-xs text-muted-foreground">
                {[formatarData(t.data), t.descricao, t.responsavel && `por ${t.responsavel}`].filter(Boolean).join(" · ")}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {t.animais.map((a) => identificacaoAnimal(a)).join(", ")}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setAcao({ tipo: "confirmar", transferencia: t })}>
                <Check className="size-4" />
                Confirmar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAcao({ tipo: "recusar", transferencia: t })}>
                <X className="size-4" />
                Recusar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={acao !== null} onOpenChange={(aberto) => !aberto && setAcao(null)}>
        <DialogContent className="sm:max-w-md">
          {acao?.tipo === "confirmar" && (
            <ConteudoConfirmar
              key={acao.transferencia.id}
              localId={localId}
              transferencia={acao.transferencia}
              areas={areas}
              categorias={categorias}
              racas={racas}
              onFechar={() => setAcao(null)}
            />
          )}
          {acao?.tipo === "recusar" && (
            <ConteudoRecusar
              key={acao.transferencia.id}
              localId={localId}
              transferencia={acao.transferencia}
              onFechar={() => setAcao(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ConteudoConfirmar({
  localId,
  transferencia,
  areas,
  categorias,
  racas,
  onFechar,
}: {
  localId: string;
  transferencia: Transferencia;
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  onFechar: () => void;
}) {
  const categoriasDaEspecie = categorias.filter((c) => !transferencia.especie || c.especie === transferencia.especie);
  const [areaId, setAreaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [racaId, setRacaId] = useState(racas.find((r) => r.padrao)?.id ?? "");
  const [valor, setValor] = useState("");
  const [importarPais, setImportarPais] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setSalvando(true);
    setErro(null);
    try {
      const r = await confirmarTransferencia(localId, transferencia.id, {
        areaId,
        categoriaId,
        racaId,
        importarPais,
        valorPorCabeca: valor,
      });
      if (r.error) return setErro(r.error);
      toast.success(`${transferencia.animais.length} animal(is) recebido(s) de ${transferencia.outroNome}.`);
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível confirmar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirmar recebimento</DialogTitle>
        <DialogDescription>
          {transferencia.animais.length} animal(is) de {transferencia.outroNome}. Escolha onde e como eles entram aqui.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="areaRecebimento">Área</Label>
          <Select value={areaId} onValueChange={(v) => setAreaId((v as string) ?? "")} items={areas.map((a) => ({ value: a.id, label: a.nome }))}>
            <SelectTrigger id="areaRecebimento" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoriaRecebimento">Categoria</Label>
          <Select
            value={categoriaId}
            onValueChange={(v) => setCategoriaId((v as string) ?? "")}
            items={categoriasDaEspecie.map((c) => ({ value: c.id, label: c.descricao }))}
          >
            <SelectTrigger id="categoriaRecebimento" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categoriasDaEspecie.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="racaRecebimento">Raça</Label>
          <Select value={racaId} onValueChange={(v) => setRacaId((v as string) ?? "")} items={racas.map((r) => ({ value: r.id, label: r.descricao }))}>
            <SelectTrigger id="racaRecebimento" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {racas.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Valor por cabeça (opcional)</Label>
          <CampoValorReais value={valor} onChange={setValor} placeholder="Em branco: herda o valor da origem" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="importarPais" checked={importarPais} onCheckedChange={(v) => setImportarPais(v === true)} />
          <Label htmlFor="importarPais" className="font-normal">
            Trazer mãe e pai como animais externos (para manter a genealogia)
          </Label>
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onFechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={salvando || !areaId || !categoriaId || !racaId}>
          {salvando ? "Confirmando..." : "Confirmar recebimento"}
        </Button>
      </DialogFooter>
    </>
  );
}

function ConteudoRecusar({
  localId,
  transferencia,
  onFechar,
}: {
  localId: string;
  transferencia: Transferencia;
  onFechar: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function recusar() {
    setSalvando(true);
    setErro(null);
    try {
      const r = await recusarTransferencia(localId, transferencia.id, motivo);
      if (r.error) return setErro(r.error);
      toast.success("Transferência recusada. Os animais voltaram para a origem.");
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível recusar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Recusar transferência</DialogTitle>
        <DialogDescription>
          Os {transferencia.animais.length} animal(is) voltam para o rebanho de {transferencia.outroNome}.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="motivoRecusa">Motivo (opcional)</Label>
        <Textarea id="motivoRecusa" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onFechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={recusar} disabled={salvando}>
          {salvando ? "Recusando..." : "Recusar"}
        </Button>
      </DialogFooter>
    </>
  );
}
