"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { salvarAnimalExterno } from "@/lib/actions/externos";
import { CampoCategoria } from "../../animais/campo-categoria";
import { CampoRaca } from "../../animais/campo-raca";
import { SeletorAnimalParente } from "./seletor-animal-parente";
import type { CandidatoGenealogia, CategoriaIvz, Especie, Externo, OpcaoCategoria, OpcaoRaca } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];

function exigeRegistro(grauSangue: string) {
  return grauSangue !== "SR" && grauSangue !== "Desconhecido";
}

const hojeISO = new Date().toISOString().slice(0, 10);

type Props = {
  localId: string;
  externo: Externo | "novo" | null;
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  categoriasIvz: CategoriaIvz[];
  candidatos: CandidatoGenealogia[];
  onFechar: () => void;
};

export function DialogoExterno({ localId, externo, categorias, racas, categoriasIvz, candidatos, onFechar }: Props) {
  const [resultado, acao, emAndamento] = useActionState(salvarAnimalExterno, undefined);
  const existente = externo && externo !== "novo" ? externo : null;

  const [especieFiltro, setEspecieFiltro] = useState<Especie>(existente?.especie ?? "bovino");
  const [categoriasLocais, setCategoriasLocais] = useState(categorias);
  const [categoriaId, setCategoriaId] = useState(existente?.categoria_id ?? "");
  const [racasLocais, setRacasLocais] = useState(racas);
  const [racaId, setRacaId] = useState(existente?.raca_id ?? racas.find((r) => r.padrao)?.id ?? "");
  const [grauSangue, setGrauSangue] = useState(existente?.grau_sangue ?? "Desconhecido");
  const [dataNascimento, setDataNascimento] = useState(existente?.data_nascimento ?? "");
  const [nome, setNome] = useState(existente?.nome ?? "");
  const [brinco, setBrinco] = useState(existente?.brinco ?? "");
  const [tatuagem, setTatuagem] = useState(existente?.tatuagem ?? "");
  const [observacoes, setObservacoes] = useState(existente?.observacoes ?? "");
  const [registroProvisorio, setRegistroProvisorio] = useState(existente?.registro_provisorio ?? "");
  const [registroDefinitivo, setRegistroDefinitivo] = useState(existente?.registro_definitivo ?? "");

  const [paiId, setPaiId] = useState(existente?.pai_id ?? "");
  const [paiResumo, setPaiResumo] = useState(existente?.pai_identificacao ?? "");
  const [maeId, setMaeId] = useState(existente?.mae_id ?? "");
  const [maeResumo, setMaeResumo] = useState(existente?.mae_identificacao ?? "");
  const [seletorAberto, setSeletorAberto] = useState<"pai" | "mae" | null>(null);

  const categoriasDaEspecie = useMemo(
    () => categoriasLocais.filter((c) => c.especie === especieFiltro),
    [categoriasLocais, especieFiltro],
  );
  const categoriaSelecionada = categoriasLocais.find((c) => c.id === categoriaId);

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <>
      <Dialog open={externo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{existente ? "Editar animal externo" : "Novo animal externo"}</DialogTitle>
          </DialogHeader>
          {externo && (
            <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
              <input type="hidden" name="localId" value={localId} />
              {existente && <input type="hidden" name="id" value={existente.id} />}
              <input type="hidden" name="paiId" value={paiId} />
              <input type="hidden" name="maeId" value={maeId} />

              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                Animal externo (touro de sêmen, doadora de embrião ou ancestral comprado): entra na
                genealogia, mas nunca aparece em estoque, manejo sanitário ou movimentação de área.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="especieExterno">Espécie</Label>
                  <Select
                    value={especieFiltro}
                    onValueChange={(v) => {
                      const nova = (v ?? "bovino") as Especie;
                      setEspecieFiltro(nova);
                      if (categoriaSelecionada?.especie !== nova) setCategoriaId("");
                    }}
                    items={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
                  >
                    <SelectTrigger id="especieExterno" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(rotulosEspecie).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <CampoCategoria
                  htmlId="categoriaExterno"
                  value={categoriaId}
                  onValueChange={setCategoriaId}
                  categorias={categoriasDaEspecie}
                  categoriasIvz={categoriasIvz}
                  especie={especieFiltro}
                  localId={localId}
                  onCriada={(categoria) => setCategoriasLocais((atual) => [...atual, categoria])}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nomeExterno">Nome</Label>
                <Input id="nomeExterno" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="brincoExterno">Brinco</Label>
                  <Input
                    id="brincoExterno"
                    name="brinco"
                    value={brinco}
                    onChange={(e) => setBrinco(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tatuagemExterno">Tatuagem</Label>
                  <Input
                    id="tatuagemExterno"
                    name="tatuagem"
                    value={tatuagem}
                    onChange={(e) => setTatuagem(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dataNascimentoExterno">Data de nascimento</Label>
                  <Input
                    id="dataNascimentoExterno"
                    name="dataNascimento"
                    type="date"
                    max={hojeISO}
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                  />
                </div>
                <CampoRaca
                  htmlId="racaExterno"
                  value={racaId}
                  onValueChange={setRacaId}
                  racas={racasLocais}
                  localId={localId}
                  onCriada={(raca) => setRacasLocais((atual) => [...atual, raca])}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CampoParente
                  rotulo="Pai"
                  resumo={paiResumo}
                  onBuscar={() => setSeletorAberto("pai")}
                  onLimpar={() => {
                    setPaiId("");
                    setPaiResumo("");
                  }}
                />
                <CampoParente
                  rotulo="Mãe"
                  resumo={maeResumo}
                  onBuscar={() => setSeletorAberto("mae")}
                  onLimpar={() => {
                    setMaeId("");
                    setMaeResumo("");
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="grauSangueExterno">Grau de sangue</Label>
                <Select
                  name="grauSangue"
                  value={grauSangue}
                  onValueChange={(v) => setGrauSangue(v ?? "Desconhecido")}
                  items={grausSangue.map((g) => ({ value: g, label: g }))}
                >
                  <SelectTrigger id="grauSangueExterno" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {grausSangue.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {exigeRegistro(grauSangue) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="registroProvisorioExterno">Registro provisório</Label>
                    <Input
                      id="registroProvisorioExterno"
                      name="registroProvisorio"
                      value={registroProvisorio}
                      onChange={(e) => setRegistroProvisorio(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="registroDefinitivoExterno">Registro definitivo</Label>
                    <Input
                      id="registroDefinitivoExterno"
                      name="registroDefinitivo"
                      value={registroDefinitivo}
                      onChange={(e) => setRegistroDefinitivo(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="observacoesExterno">Observações</Label>
                <Textarea
                  id="observacoesExterno"
                  name="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
              <DialogFooter>
                <Button type="submit" disabled={emAndamento || !categoriaId || !racaId}>
                  {emAndamento ? "Salvando..." : existente ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <SeletorAnimalParente
        aberto={seletorAberto === "pai"}
        titulo="Selecionar pai"
        sexo="macho"
        candidatos={candidatos}
        excluirId={existente?.id}
        onSelecionar={(id, resumo) => {
          setPaiId(id);
          setPaiResumo(resumo);
          setSeletorAberto(null);
        }}
        onFechar={() => setSeletorAberto(null)}
      />
      <SeletorAnimalParente
        aberto={seletorAberto === "mae"}
        titulo="Selecionar mãe"
        sexo="femea"
        candidatos={candidatos}
        excluirId={existente?.id}
        onSelecionar={(id, resumo) => {
          setMaeId(id);
          setMaeResumo(resumo);
          setSeletorAberto(null);
        }}
        onFechar={() => setSeletorAberto(null)}
      />
    </>
  );
}

function CampoParente({
  rotulo,
  resumo,
  onBuscar,
  onLimpar,
}: {
  rotulo: string;
  resumo: string;
  onBuscar: () => void;
  onLimpar: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{rotulo}</Label>
      {resumo ? (
        <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="truncate">{resumo}</span>
          <button type="button" onClick={onLimpar} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={onBuscar}
          className="justify-start font-normal text-muted-foreground"
        >
          Buscar animal...
        </Button>
      )}
    </div>
  );
}
