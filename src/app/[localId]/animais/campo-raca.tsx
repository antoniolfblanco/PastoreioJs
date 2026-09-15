"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarRaca } from "@/lib/actions/racas";
import type { OpcaoRaca } from "./page";

// Texto livre com autocompletar em vez de um dropdown fechado — digita pra
// filtrar, escolhe uma sugestão, e dá pra apagar de novo depois de
// selecionado. Ao sair do campo sem uma raça válida, volta pra "Não
// Informado" (a raça padrão semeada em todo local) em vez de deixar
// qualquer texto solto gravado.
export function CampoRaca({
  htmlId,
  value,
  onValueChange,
  racas,
  localId,
  onCriada,
}: {
  htmlId: string;
  value: string;
  onValueChange: (v: string) => void;
  racas: OpcaoRaca[];
  localId: string;
  onCriada: (raca: OpcaoRaca) => void;
}) {
  const racaSelecionada = useMemo(() => racas.find((r) => r.id === value), [racas, value]);
  // Só inicializa a partir do valor recebido — depois disso, quem manda no
  // texto exibido são os handlers abaixo (selecionar, limpar, criar, sair do
  // campo), nunca um efeito reagindo à mudança de `value` por fora.
  const [texto, setTexto] = useState(racaSelecionada?.descricao ?? "");
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [dialogoAberto, setDialogoAberto] = useState(false);

  const sugestoes = useMemo(() => {
    const termo = texto.trim().toLowerCase();
    const lista = termo ? racas.filter((r) => r.descricao.toLowerCase().includes(termo)) : racas;
    return lista.slice(0, 8);
  }, [racas, texto]);

  function selecionar(raca: OpcaoRaca) {
    onValueChange(raca.id);
    setTexto(raca.descricao);
    setSugestoesAbertas(false);
  }

  function limpar() {
    onValueChange("");
    setTexto("");
  }

  function aoSairDoFoco() {
    // Espera um instante antes de validar, pra dar tempo do clique numa
    // sugestão da lista registrar (senão o blur fecha a lista antes do
    // clique valer).
    setTimeout(() => {
      setSugestoesAbertas(false);
      const encontrada = racas.find((r) => r.descricao.trim().toLowerCase() === texto.trim().toLowerCase());
      if (encontrada) {
        if (encontrada.id !== value) onValueChange(encontrada.id);
        return;
      }
      const naoInformada = racas.find((r) => r.padrao);
      onValueChange(naoInformada?.id ?? "");
      setTexto(naoInformada?.descricao ?? "");
    }, 150);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlId}>Raça</Label>
      <div className="flex items-center gap-1.5">
        <div className="relative w-full">
          <Input
            id={htmlId}
            value={texto}
            autoComplete="off"
            className="pr-8"
            onChange={(e) => {
              setTexto(e.target.value);
              setSugestoesAbertas(true);
            }}
            onFocus={() => setSugestoesAbertas(true)}
            onBlur={aoSairDoFoco}
          />
          {texto && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={limpar}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Limpar</span>
            </button>
          )}
          {sugestoesAbertas && sugestoes.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
              {sugestoes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionar(r)}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {r.descricao}
                </button>
              ))}
            </div>
          )}
        </div>
        <input type="hidden" name="racaId" value={value} />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title="Nova raça"
          onClick={() => setDialogoAberto(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <DialogoCriarRaca
        localId={localId}
        aberto={dialogoAberto}
        onFechar={() => setDialogoAberto(false)}
        onCriada={(raca) => {
          onCriada(raca);
          onValueChange(raca.id);
          setTexto(raca.descricao);
        }}
      />
    </div>
  );
}

function DialogoCriarRaca({
  localId,
  aberto,
  onFechar,
  onCriada,
}: {
  localId: string;
  aberto: boolean;
  onFechar: () => void;
  onCriada: (raca: OpcaoRaca) => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmAndamento(true);
    setErro(undefined);
    const resultado = await salvarRaca(undefined, new FormData(e.currentTarget));
    setEmAndamento(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    if (resultado?.id) {
      onCriada({ id: resultado.id, descricao, padrao: false });
      setDescricao("");
      onFechar();
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova raça</DialogTitle>
        </DialogHeader>
        <form onSubmit={criar} className="flex flex-col gap-4">
          <input type="hidden" name="localId" value={localId} />
          <input type="hidden" name="ativo" value="on" />
          <div className="flex flex-col gap-2">
            <Label htmlFor="novaRacaDescricao">Nome</Label>
            <Input
              id="novaRacaDescricao"
              name="descricao"
              required
              autoFocus
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="submit" disabled={emAndamento}>
              {emAndamento ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
