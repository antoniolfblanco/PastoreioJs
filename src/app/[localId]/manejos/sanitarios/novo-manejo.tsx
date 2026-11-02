"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { CardSelecaoAnimais, identificacaoAnimal } from "@/components/card-selecao-animais";
import { registrarManejoSanitario } from "@/lib/actions/manejos-sanitarios";
import { CampoMedicamentos } from "./campo-medicamentos";
import type { AnimalManejo, Especie, OpcaoArea, OpcaoMedicamento } from "./page";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

// Cada manejo da lista vira um registro de manejo sanitário ao finalizar.
// No banco o manejo pertence a UMA área — por isso, sem área escolhida, os
// animais marcados de áreas diferentes viram um manejo por área.
type Manejo = {
  chave: number;
  animais: AnimalManejo[];
  areaId: string;
  areaNome: string;
  data: string;
  medicamentoIds: string[];
  medicamentos: string[];
  descricao: string;
  responsavel: string;
  observacoes: string;
};

export function NovoManejo({
  localId,
  animais,
  areas,
  medicamentos,
}: {
  localId: string;
  animais: AnimalManejo[];
  areas: OpcaoArea[];
  medicamentos: OpcaoMedicamento[];
}) {
  const [aberta, setAberta] = useState(false);

  const [especie, setEspecie] = useState<Especie>("bovino");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  // Card do meio
  const [data, setData] = useState(hojeISO);
  const [areaId, setAreaId] = useState("");
  const [medicamentosLocais, setMedicamentosLocais] = useState(medicamentos);
  const [medicamentosSelecionados, setMedicamentosSelecionados] = useState<Set<string>>(new Set());
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [proximaChave, setProximaChave] = useState(1);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());

  const [erroForm, setErroForm] = useState<string | undefined>();
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const idsNaLista = useMemo(() => new Set(manejos.flatMap((m) => m.animais.map((a) => a.id))), [manejos]);
  const totalAnimais = idsNaLista.size;
  const qtdMarcados = marcados.size;

  const areasDosMarcados = useMemo(
    () => new Set(animais.filter((a) => marcados.has(a.id)).map((a) => a.area_id)),
    [animais, marcados],
  );

  function trocarEspecie(nova: Especie) {
    setEspecie(nova);
    setMarcados(new Set());
  }

  function adicionar() {
    setErroForm(undefined);
    if (qtdMarcados === 0) return;
    if (!data) return setErroForm("Informe a data do manejo.");
    if (medicamentosSelecionados.size === 0 && !descricao.trim()) {
      return setErroForm("Escolha ao menos um medicamento ou escreva uma descrição.");
    }

    const selecionados = animais.filter((a) => marcados.has(a.id));
    const nomesMedicamentos = medicamentosLocais
      .filter((m) => medicamentosSelecionados.has(m.id))
      .map((m) => m.descricao);

    // Área escolhida: um manejo só. Sem área: um manejo por área dos animais.
    const porArea = new Map<string, AnimalManejo[]>();
    if (areaId) porArea.set(areaId, selecionados);
    else
      for (const a of selecionados) {
        const lista = porArea.get(a.area_id) ?? [];
        lista.push(a);
        porArea.set(a.area_id, lista);
      }

    let chave = proximaChave;
    const novos: Manejo[] = Array.from(porArea.entries()).map(([idArea, lista]) => ({
      chave: chave++,
      animais: lista,
      areaId: idArea,
      areaNome: areas.find((x) => x.id === idArea)?.nome ?? lista[0]?.area_nome ?? "—",
      data,
      medicamentoIds: Array.from(medicamentosSelecionados),
      medicamentos: nomesMedicamentos,
      descricao,
      responsavel,
      observacoes,
    }));
    setManejos((atual) => [...atual, ...novos]);
    setProximaChave(chave);
    setMarcados(new Set());
    // Os dados do manejo ficam — o comum é aplicar o mesmo em vários lotes.
  }

  function remover(chave: number) {
    setManejos((atual) => atual.filter((m) => m.chave !== chave));
  }

  function alternarAberto(chave: number) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function limparTudo() {
    setMarcados(new Set());
    setData(hojeISO());
    setAreaId("");
    setMedicamentosSelecionados(new Set());
    setDescricao("");
    setResponsavel("");
    setObservacoes("");
    setManejos([]);
    setAbertos(new Set());
    setErro(undefined);
    setErroForm(undefined);
  }

  function cancelar() {
    if (manejos.length > 0 && !confirm("Descartar os manejos da lista?")) return;
    limparTudo();
    setAberta(false);
  }

  async function finalizar() {
    if (manejos.length === 0) return;
    setEmAndamento(true);
    setErro(undefined);

    // Uma chamada por manejo. Se uma falhar, os já gravados saem da lista.
    let gravados = 0;
    for (const m of manejos) {
      const formData = new FormData();
      formData.set("localId", localId);
      formData.set("animalIds", JSON.stringify(m.animais.map((a) => a.id)));
      formData.set("medicamentoIds", JSON.stringify(m.medicamentoIds));
      formData.set("areaId", m.areaId);
      formData.set("especie", especie);
      formData.set("data", m.data);
      formData.set("responsavel", m.responsavel);
      formData.set("descricao", m.descricao);
      formData.set("observacoes", m.observacoes);

      const resultado = await registrarManejoSanitario(undefined, formData);
      if (resultado?.erro) {
        setManejos(manejos.slice(gravados));
        setErro((gravados > 0 ? `${gravados} manejo(s) registrado(s), mas o seguinte falhou. ` : "") + resultado.erro);
        setEmAndamento(false);
        return;
      }
      gravados++;
    }

    setEmAndamento(false);
    toast.success(`${gravados} manejo(s) registrado(s) — ${totalAnimais} animal(is).`);
    limparTudo();
    setAberta(false);
  }

  if (!aberta) {
    return (
      <div>
        <Button onClick={() => setAberta(true)}>
          <Plus className="size-4" />
          Novo manejo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Registrar manejos sanitários</h2>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <X className="size-4" />
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_18rem_minmax(0,1fr)]">
        <CardSelecaoAnimais
          animais={animais}
          especie={especie}
          onTrocarEspecie={trocarEspecie}
          especieTravada={manejos.length > 0}
          marcados={marcados}
          onMarcadosChange={setMarcados}
          idsIndisponiveis={idsNaLista}
          rotuloIndisponivel="Na lista"
        />

        {/* Entre os cards: dados do manejo */}
        <div className="flex flex-col gap-3 self-start rounded-xl border bg-muted/30 p-4 xl:sticky xl:top-4 xl:mt-16">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataNovoManejo">Data</Label>
            <Input id="dataNovoManejo" type="date" max={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Medicamentos</Label>
            <CampoMedicamentos
              localId={localId}
              medicamentos={medicamentosLocais}
              selecionados={medicamentosSelecionados}
              onChange={setMedicamentosSelecionados}
              onCriado={(m) => setMedicamentosLocais((atual) => [...atual, m])}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoNovoManejo">Descrição</Label>
            <Input
              id="descricaoNovoManejo"
              placeholder="Ex.: Vacina aftosa — 1ª etapa"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="areaNovoManejo">Área do manejo</Label>
            <Select
              value={areaId}
              onValueChange={(v) => setAreaId(v ?? "")}
              items={[{ value: "", label: "Área de cada animal" }, ...areas.map((a) => ({ value: a.id, label: a.nome }))]}
            >
              <SelectTrigger id="areaNovoManejo" className="w-full">
                <SelectValue placeholder="Área de cada animal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Área de cada animal</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!areaId && areasDosMarcados.size > 1 && (
              <span className="text-xs text-muted-foreground">
                Os marcados estão em {areasDosMarcados.size} áreas — vira um manejo por área.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="responsavelNovoManejo">Responsável</Label>
            <Input id="responsavelNovoManejo" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obsNovoManejo">Observações</Label>
            <Textarea
              id="obsNovoManejo"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-16"
            />
          </div>

          {erroForm && <p className="text-sm text-destructive">{erroForm}</p>}

          <Button disabled={qtdMarcados === 0} onClick={adicionar}>
            Adicionar {qtdMarcados > 0 ? `(${qtdMarcados})` : ""}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Lista dos manejos a registrar */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Manejos a registrar</CardTitle>
            <CardDescription>
              {totalAnimais} animal(is) em {manejos.length} manejo(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {manejos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <p>Marque animais à esquerda, escolha os medicamentos e clique em Adicionar.</p>
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Manejo</TableHead>
                      <TableHead className="text-right">Animais</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manejos.map((m) => {
                      const aberto = abertos.has(m.chave);
                      const detalhes = [m.descricao || null, m.responsavel ? `por ${m.responsavel}` : null].filter(
                        Boolean,
                      );
                      return (
                        <Fragment key={m.chave}>
                          <TableRow className="bg-muted/30">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => alternarAberto(m.chave)}
                                className="flex items-start gap-1 text-left"
                              >
                                {aberto ? (
                                  <ChevronDown className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="mt-0.5 size-4 shrink-0" />
                                )}
                                <span className="flex flex-col gap-0.5">
                                  <span className="font-medium">
                                    {formatarData(m.data)} · {m.areaNome}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {m.medicamentos.length > 0 ? m.medicamentos.join(", ") : "Sem medicamento"}
                                  </span>
                                  {detalhes.length > 0 && (
                                    <span className="text-xs text-muted-foreground">{detalhes.join(" · ")}</span>
                                  )}
                                  {m.observacoes && (
                                    <span className="text-xs italic text-muted-foreground">{m.observacoes}</span>
                                  )}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{m.animais.length}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                title="Tirar da lista"
                                onClick={() => remover(m.chave)}
                              >
                                <X className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {aberto &&
                            m.animais.map((a) => (
                              <TableRow key={a.id} className="text-muted-foreground">
                                <TableCell className="pl-8">
                                  {identificacaoAnimal(a)}
                                  <span className="text-xs">
                                    {" "}
                                    · {a.categoria_descricao} · {a.area_nome}
                                  </span>
                                </TableCell>
                                <TableCell />
                                <TableCell />
                              </TableRow>
                            ))}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button size="lg" className="h-12 text-base" disabled={manejos.length === 0 || emAndamento} onClick={finalizar}>
        {emAndamento ? "Registrando..." : `Finalizar manejos (${totalAnimais} animais)`}
      </Button>
    </div>
  );
}
