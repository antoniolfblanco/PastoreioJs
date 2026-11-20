"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarPelagem } from "@/lib/actions/pelagens";

export type OpcaoPelagem = { id: string; descricao: string };

// Pelagem do equino: texto com autocompletar (igual ao campo de raça), com
// o "+" para cadastrar uma nova na hora. É opcional: ao sair do campo sem
// uma pelagem válida, fica em branco.
export function CampoPelagem({
  htmlId,
  value,
  onValueChange,
  pelagens,
  localId,
  onCriada,
}: {
  htmlId: string;
  value: string;
  onValueChange: (v: string) => void;
  pelagens: OpcaoPelagem[];
  localId: string;
  onCriada: (pelagem: OpcaoPelagem) => void;
}) {
  const pelagemSelecionada = useMemo(() => pelagens.find((r) => r.id === value), [pelagens, value]);
  // Só inicializa a partir do valor recebido — depois disso, quem manda no
  // texto exibido são os handlers abaixo (selecionar, limpar, criar, sair do
  // campo), nunca um efeito reagindo à mudança de `value` por fora.
  const [texto, setTexto] = useState(pelagemSelecionada?.descricao ?? "");
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [dialogoAberto, setDialogoAberto] = useState(false);

  const sugestoes = useMemo(() => {
    const termo = texto.trim().toLowerCase();
    const lista = termo ? pelagens.filter((r) => r.descricao.toLowerCase().includes(termo)) : pelagens;
    return lista.slice(0, 8);
  }, [pelagens, texto]);

  function selecionar(pelagem: OpcaoPelagem) {
    onValueChange(pelagem.id);
    setTexto(pelagem.descricao);
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
      const encontrada = pelagens.find((r) => r.descricao.trim().toLowerCase() === texto.trim().toLowerCase());
      if (encontrada) {
        if (encontrada.id !== value) onValueChange(encontrada.id);
        return;
      }
      onValueChange("");
      setTexto("");
    }, 150);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlId}>Pelagem</Label>
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
        <input type="hidden" name="pelagemId" value={value} />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title="Nova pelagem"
          onClick={() => setDialogoAberto(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <DialogoCriarPelagem
        localId={localId}
        aberto={dialogoAberto}
        onFechar={() => setDialogoAberto(false)}
        onCriada={(pelagem) => {
          onCriada(pelagem);
          onValueChange(pelagem.id);
          setTexto(pelagem.descricao);
        }}
      />
    </div>
  );
}

function DialogoCriarPelagem({
  localId,
  aberto,
  onFechar,
  onCriada,
}: {
  localId: string;
  aberto: boolean;
  onFechar: () => void;
  onCriada: (pelagem: OpcaoPelagem) => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmAndamento(true);
    setErro(undefined);
    const resultado = await salvarPelagem(undefined, new FormData(e.currentTarget));
    setEmAndamento(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    if (resultado?.id) {
      onCriada({ id: resultado.id, descricao });
      setDescricao("");
      onFechar();
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova pelagem</DialogTitle>
        </DialogHeader>
        <form onSubmit={criar} className="flex flex-col gap-4">
          <input type="hidden" name="localId" value={localId} />
          <input type="hidden" name="ativo" value="on" />
          <div className="flex flex-col gap-2">
            <Label htmlFor="novaPelagemDescricao">Nome</Label>
            <Input
              id="novaPelagemDescricao"
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
