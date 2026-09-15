"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { criarAnimal, atualizarAnimal } from "@/lib/actions/animais";
import { CampoArea } from "./campo-area";
import { CampoCategoria } from "./campo-categoria";
import { CampoRaca } from "./campo-raca";
import { SeletorAnimalDialog, identificacaoCompleta } from "./seletor-animal-dialog";
import type { Animal, CategoriaIvz, Especie, OpcaoArea, OpcaoCategoria, OpcaoRaca } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];

function exigeRegistro(grauSangue: string) {
  return grauSangue !== "SR" && grauSangue !== "Desconhecido";
}

// Incrementa o número final do brinco anterior (ex.: "BR-101" -> "BR-102"),
// preservando zeros à esquerda. Sem número no final, não sugere nada — igual
// ao app Flutter.
function sugerirProximoBrinco(brinco: string | null | undefined): string {
  if (!brinco) return "";
  const match = brinco.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return "";
  const [, prefixo, numero, sufixo] = match;
  const proximo = (Number(numero) + 1).toString().padStart(numero.length, "0");
  return `${prefixo}${proximo}${sufixo}`;
}

const hojeISO = new Date().toISOString().slice(0, 10);

type Props = {
  localId: string;
  animal: Animal | "novo" | null;
  animais: Animal[];
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  categoriasIvz: CategoriaIvz[];
  temCicloAtivo: boolean;
  onFechar: () => void;
};

export function DialogoAnimal({
  localId,
  animal,
  animais,
  areas,
  categorias,
  racas,
  categoriasIvz,
  temCicloAtivo,
  onFechar,
}: Props) {
  const existente = animal && animal !== "novo" ? animal : null;
  const acaoAnimal = existente ? atualizarAnimal : criarAnimal;
  const [resultado, acao, emAndamento] = useActionState(acaoAnimal, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const brincoRef = useRef<HTMLInputElement>(null);
  const intencaoRef = useRef<"fechar" | "continuar">("fechar");

  const [especieFiltro, setEspecieFiltro] = useState<Especie>(
    existente?.especie ?? categorias[0]?.especie ?? "bovino",
  );
  const [areasLocais, setAreasLocais] = useState(areas);
  const [areaId, setAreaId] = useState(existente?.area_id ?? "");
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
  const [castrado, setCastrado] = useState(existente?.castrado ?? false);
  const [valor, setValor] = useState(existente?.valor != null ? String(existente.valor) : "");

  const paiInicial = existente?.pai_id ? animais.find((a) => a.id === existente.pai_id) : null;
  const maeInicial = existente?.mae_id ? animais.find((a) => a.id === existente.mae_id) : null;
  const receptoraInicial = existente?.receptora_id ? animais.find((a) => a.id === existente.receptora_id) : null;
  const [paiId, setPaiId] = useState(existente?.pai_id ?? "");
  const [paiResumo, setPaiResumo] = useState(paiInicial ? identificacaoCompleta(paiInicial) : "");
  const [maeId, setMaeId] = useState(existente?.mae_id ?? "");
  const [maeResumo, setMaeResumo] = useState(maeInicial ? identificacaoCompleta(maeInicial) : "");
  const [veioDeTE, setVeioDeTE] = useState(!!existente?.receptora_id);
  const [receptoraId, setReceptoraId] = useState(existente?.receptora_id ?? "");
  const [receptoraResumo, setReceptoraResumo] = useState(
    receptoraInicial ? identificacaoCompleta(receptoraInicial) : "",
  );
  const [seletorAberto, setSeletorAberto] = useState<"pai" | "mae" | "receptora" | null>(null);

  const categoriasDaEspecie = useMemo(
    () => categoriasLocais.filter((c) => c.especie === especieFiltro),
    [categoriasLocais, especieFiltro],
  );
  const categoriaSelecionada = categoriasLocais.find((c) => c.id === categoriaId);

  useEffect(() => {
    if (resultado === undefined || resultado.erro) return;
    if (existente) {
      onFechar();
      return;
    }
    if (intencaoRef.current === "fechar") {
      onFechar();
      return;
    }
    // "Salvar e adicionar outro": mantém área/categoria/espécie/raça/grau de
    // sangue/data de nascimento (o que se repete entre cabeças do mesmo
    // lote de digitação) e limpa só os campos individuais.
    toast.success("Animal cadastrado com sucesso!");
    setNome("");
    setBrinco(sugerirProximoBrinco(resultado.brinco));
    setTatuagem("");
    setObservacoes("");
    setRegistroProvisorio("");
    setRegistroDefinitivo("");
    setPaiId("");
    setPaiResumo("");
    setMaeId("");
    setMaeResumo("");
    setVeioDeTE(false);
    setReceptoraId("");
    setReceptoraResumo("");
    setCastrado(false);
    setValor("");
    brincoRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  function submeter(intencao: "fechar" | "continuar") {
    intencaoRef.current = intencao;
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <Dialog open={animal !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{existente ? "Editar animal" : "Novo animal"}</DialogTitle>
          </DialogHeader>
          {animal && (
            <form ref={formRef} action={acao} className="flex flex-col gap-4">
              <input type="hidden" name="localId" value={localId} />
              {existente && <input type="hidden" name="id" value={existente.id} />}
              <input type="hidden" name="valor" value={valor} />
              <input type="hidden" name="paiId" value={paiId} />
              <input type="hidden" name="maeId" value={maeId} />
              <input type="hidden" name="receptoraId" value={veioDeTE ? receptoraId : ""} />

              {!existente && temCicloAtivo && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Já existe um ciclo em andamento. Cadastrar aqui soma no estoque inicial dele — se o
                  animal nasceu ou foi comprado durante o ciclo, prefira as rotinas de Nascimento/Compra
                  (em breve).
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="valorAnimal">Valor (R$, opcional)</Label>
                <CampoValorReais value={valor} onChange={setValor} className="max-w-40" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="especieAnimal">Espécie</Label>
                  <Select
                    value={especieFiltro}
                    onValueChange={(v) => {
                      const nova = (v ?? "bovino") as Especie;
                      setEspecieFiltro(nova);
                      if (categoriaSelecionada?.especie !== nova) setCategoriaId("");
                    }}
                    items={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
                  >
                    <SelectTrigger id="especieAnimal" className="w-full">
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
                <CampoArea
                  htmlId="areaAnimal"
                  value={areaId}
                  onValueChange={setAreaId}
                  areas={areasLocais}
                  localId={localId}
                  onCriada={(area) => setAreasLocais((atual) => [...atual, area])}
                />
                <CampoCategoria
                  htmlId="categoriaAnimal"
                  value={categoriaId}
                  onValueChange={setCategoriaId}
                  categorias={categoriasDaEspecie}
                  categoriasIvz={categoriasIvz}
                  especie={especieFiltro}
                  localId={localId}
                  onCriada={(categoria) => setCategoriasLocais((atual) => [...atual, categoria])}
                />
                {categoriaSelecionada?.sexo === "macho" && (
                  <div className="flex items-end gap-2 pb-2">
                    <Checkbox
                      id="castradoAnimal"
                      name="castrado"
                      checked={castrado}
                      onCheckedChange={(v) => setCastrado(v === true)}
                    />
                    <Label htmlFor="castradoAnimal">Castrado</Label>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nomeAnimal">Nome</Label>
                <Input id="nomeAnimal" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="brincoAnimal">Brinco</Label>
                  <Input
                    id="brincoAnimal"
                    name="brinco"
                    ref={brincoRef}
                    value={brinco}
                    onChange={(e) => setBrinco(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tatuagemAnimal">Tatuagem</Label>
                  <Input
                    id="tatuagemAnimal"
                    name="tatuagem"
                    value={tatuagem}
                    onChange={(e) => setTatuagem(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dataNascimentoAnimal">Data de nascimento</Label>
                  <Input
                    id="dataNascimentoAnimal"
                    name="dataNascimento"
                    type="date"
                    max={hojeISO}
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                  />
                </div>
                <CampoRaca
                  htmlId="racaAnimal"
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

              <div className="flex items-center gap-2">
                <Checkbox
                  id="veioDeTeAnimal"
                  checked={veioDeTE}
                  onCheckedChange={(v) => {
                    const novo = v === true;
                    setVeioDeTE(novo);
                    if (!novo) {
                      setReceptoraId("");
                      setReceptoraResumo("");
                    }
                  }}
                />
                <Label htmlFor="veioDeTeAnimal">Veio de transferência de embrião (TE)?</Label>
              </div>
              {veioDeTE && (
                <CampoParente
                  rotulo="Receptora"
                  resumo={receptoraResumo}
                  onBuscar={() => setSeletorAberto("receptora")}
                  onLimpar={() => {
                    setReceptoraId("");
                    setReceptoraResumo("");
                  }}
                />
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="grauSangueAnimal">Grau de sangue</Label>
                <Select
                  name="grauSangue"
                  value={grauSangue}
                  onValueChange={(v) => setGrauSangue(v ?? "Desconhecido")}
                  items={grausSangue.map((g) => ({ value: g, label: g }))}
                >
                  <SelectTrigger id="grauSangueAnimal" className="w-full">
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
                    <Label htmlFor="registroProvisorioAnimal">Registro provisório</Label>
                    <Input
                      id="registroProvisorioAnimal"
                      name="registroProvisorio"
                      value={registroProvisorio}
                      onChange={(e) => setRegistroProvisorio(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="registroDefinitivoAnimal">Registro definitivo</Label>
                    <Input
                      id="registroDefinitivoAnimal"
                      name="registroDefinitivo"
                      value={registroDefinitivo}
                      onChange={(e) => setRegistroDefinitivo(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="observacoesAnimal">Observações</Label>
                <Textarea
                  id="observacoesAnimal"
                  name="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
              <DialogFooter className="gap-2">
                {!existente && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={emAndamento}
                    onClick={() => submeter("continuar")}
                  >
                    Salvar e adicionar outro
                  </Button>
                )}
                <Button type="button" disabled={emAndamento} onClick={() => submeter("fechar")}>
                  {emAndamento ? "Salvando..." : existente ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <SeletorAnimalDialog
        aberto={seletorAberto === "pai"}
        titulo="Selecionar pai"
        sexo="macho"
        animais={animais}
        excluirId={existente?.id}
        onSelecionar={(id, resumo) => {
          setPaiId(id);
          setPaiResumo(resumo);
        }}
        onFechar={() => setSeletorAberto(null)}
      />
      <SeletorAnimalDialog
        aberto={seletorAberto === "mae"}
        titulo="Selecionar mãe"
        sexo="femea"
        animais={animais}
        excluirId={existente?.id}
        onSelecionar={(id, resumo) => {
          setMaeId(id);
          setMaeResumo(resumo);
        }}
        onFechar={() => setSeletorAberto(null)}
      />
      <SeletorAnimalDialog
        aberto={seletorAberto === "receptora"}
        titulo="Selecionar receptora"
        sexo="femea"
        animais={animais}
        excluirId={existente?.id}
        onSelecionar={(id, resumo) => {
          setReceptoraId(id);
          setReceptoraResumo(resumo);
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
