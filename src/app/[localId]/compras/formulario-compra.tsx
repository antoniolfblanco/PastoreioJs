"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Calculator } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { CampoValorReais } from "@/components/campo-valor-reais";
import { cn } from "@/lib/utils";
import { ratearValorTotal, rateioPorPeso } from "@/lib/rateio";
import { registrarCompra } from "@/lib/actions/compras";
import { CampoArea } from "../animais/campo-area";
import { CampoCategoria } from "../animais/campo-categoria";
import { CampoRaca } from "../animais/campo-raca";
import type { CategoriaIvz, Especie, OpcaoArea, OpcaoCategoria, OpcaoRaca, Sexo } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };
const grausSangue = ["PO", "PC", "1/4", "1/2", "SR", "Desconhecido"];

function exigeRegistro(grauSangue: string) {
  return grauSangue !== "SR" && grauSangue !== "Desconhecido";
}

function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const hojeISO = new Date().toISOString().slice(0, 10);

type ItemCompra = {
  id: string;
  quantidade: number;
  especie: Especie;
  areaId: string;
  areaNome: string;
  categoriaId: string;
  categoriaDescricao: string;
  categoriaSexo: Sexo;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  dataNascimento: string | null;
  racaId: string;
  racaDescricao: string;
  grauSangue: string;
  registroProvisorio: string | null;
  registroDefinitivo: string | null;
  castrado: boolean;
  peso: number | null;
  valor: number | null;
};

function tituloItem(item: ItemCompra) {
  if (item.quantidade > 1) return `${item.quantidade} × ${item.categoriaDescricao}`;
  const ids = [item.nome, item.brinco, item.tatuagem].filter(Boolean);
  return ids.length > 0 ? ids.join(" • ") : item.categoriaDescricao;
}

type Props = {
  localId: string;
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  categoriasIvz: CategoriaIvz[];
  podeEditar: boolean;
};

export function FormularioCompra({ localId, areas, categorias, racas, categoriasIvz, podeEditar }: Props) {
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const [descricao, setDescricao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [data, setData] = useState(hojeISO);
  const [prazoPagamento, setPrazoPagamento] = useState("");
  const [pago, setPago] = useState(false);
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [areasLocais, setAreasLocais] = useState(areas);
  const [categoriasLocais, setCategoriasLocais] = useState(categorias);
  const [racasLocais, setRacasLocais] = useState(racas);

  const [especie, setEspecie] = useState<Especie>("bovino");
  const [areaId, setAreaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [racaId, setRacaId] = useState(racas.find((r) => r.padrao)?.id ?? "");
  const [grauSangue, setGrauSangue] = useState("Desconhecido");
  const [registroProvisorio, setRegistroProvisorio] = useState("");
  const [registroDefinitivo, setRegistroDefinitivo] = useState("");
  const [precificarPorPeso, setPrecificarPorPeso] = useState(false);
  const [valorKg, setValorKg] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");

  const [quantidade, setQuantidade] = useState("1");
  const [nome, setNome] = useState("");
  const [brinco, setBrinco] = useState("");
  const [tatuagem, setTatuagem] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [peso, setPeso] = useState("");
  const [castrado, setCastrado] = useState(false);
  const [erroItem, setErroItem] = useState<string | undefined>();

  const [itens, setItens] = useState<ItemCompra[]>([]);
  const [valorTotalRatear, setValorTotalRatear] = useState("");

  const categoriasDaEspecie = useMemo(
    () => categoriasLocais.filter((c) => c.especie === especie),
    [categoriasLocais, especie],
  );
  const categoriaSelecionada = categoriasLocais.find((c) => c.id === categoriaId);

  function valorCalculado(pesoAtual: number | null): number | null {
    if (precificarPorPeso) {
      const kg = Number(valorKg);
      if (pesoAtual != null && valorKg && !Number.isNaN(kg)) return pesoAtual * kg;
      return null;
    }
    const unitario = Number(valorUnitario);
    return valorUnitario && !Number.isNaN(unitario) ? unitario : null;
  }

  const previaValor = valorCalculado(peso ? Number(peso) : null);

  function adicionarItem() {
    const qtd = Number(quantidade);
    const area = areasLocais.find((a) => a.id === areaId);
    const categoria = categoriasDaEspecie.find((c) => c.id === categoriaId);
    const raca = racasLocais.find((r) => r.id === racaId);

    if (!Number.isInteger(qtd) || qtd < 1) return setErroItem("Informe uma quantidade válida.");
    if (!area) return setErroItem("Selecione a área.");
    if (!categoria) return setErroItem("Selecione a categoria.");
    if (!raca) return setErroItem("Selecione a raça.");

    const pesoNumero = peso ? Number(peso) : null;
    setErroItem(undefined);
    setItens((atual) => [
      ...atual,
      {
        id: crypto.randomUUID(),
        quantidade: qtd,
        especie,
        areaId: area.id,
        areaNome: area.nome,
        categoriaId: categoria.id,
        categoriaDescricao: categoria.descricao,
        categoriaSexo: categoria.sexo,
        nome: qtd === 1 ? nome.trim() || null : null,
        brinco: qtd === 1 ? brinco.trim().toUpperCase() || null : null,
        tatuagem: qtd === 1 ? tatuagem.trim() || null : null,
        dataNascimento: dataNascimento || null,
        racaId: raca.id,
        racaDescricao: raca.descricao,
        grauSangue,
        registroProvisorio: exigeRegistro(grauSangue) ? registroProvisorio.trim() || null : null,
        registroDefinitivo: exigeRegistro(grauSangue) ? registroDefinitivo.trim() || null : null,
        castrado: categoria.sexo === "macho" ? castrado : false,
        peso: pesoNumero,
        valor: valorCalculado(pesoNumero),
      },
    ]);
    setQuantidade("1");
    setNome("");
    setBrinco("");
    setTatuagem("");
    setDataNascimento("");
    setPeso("");
    setCastrado(false);
  }

  function removerItem(id: string) {
    setItens((atual) => atual.filter((i) => i.id !== id));
  }

  const itensParaRateio = useMemo(() => itens.map((i) => ({ quantidade: i.quantidade, peso: i.peso })), [itens]);
  const podeRatearPorPeso = rateioPorPeso(itensParaRateio);

  function ratearTotal() {
    const total = Number(valorTotalRatear);
    if (!valorTotalRatear || Number.isNaN(total)) return;
    const valores = ratearValorTotal(total, itensParaRateio);
    setItens((atual) => atual.map((item, indice) => ({ ...item, valor: valores[indice] ?? item.valor })));
  }

  const totalAnimais = itens.reduce((s, i) => s + i.quantidade, 0);
  const totalValor = itens.reduce((s, i) => s + (i.valor ?? 0) * i.quantidade, 0);

  async function concluirCompra() {
    setEmAndamento(true);
    setErro(undefined);

    const formData = new FormData();
    formData.set("localId", localId);
    formData.set("descricao", descricao);
    formData.set("fornecedor", fornecedor);
    formData.set("data", data);
    formData.set("prazoPagamento", prazoPagamento);
    if (pago) formData.set("pago", "on");
    formData.set("responsavel", responsavel);
    formData.set("observacoes", observacoes);
    formData.set(
      "animais",
      JSON.stringify(
        itens.flatMap((item) =>
          Array.from({ length: item.quantidade }, () => ({
            area_id: item.areaId,
            categoria_id: item.categoriaId,
            especie: item.especie,
            nome: item.nome,
            brinco: item.brinco,
            tatuagem: item.tatuagem,
            data_nascimento: item.dataNascimento,
            raca_id: item.racaId,
            sexo: item.categoriaSexo,
            grau_sangue: item.grauSangue,
            registro_provisorio: item.registroProvisorio,
            registro_definitivo: item.registroDefinitivo,
            castrado: item.castrado,
            peso_compra: item.peso,
            valor_compra: item.valor,
          })),
        ),
      ),
    );

    const resultado = await registrarCompra(undefined, formData);
    setEmAndamento(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    toast.success("Compra registrada com sucesso!");
    setDescricao("");
    setFornecedor("");
    setData(hojeISO);
    setPrazoPagamento("");
    setPago(false);
    setResponsavel("");
    setObservacoes("");
    setItens([]);
    setValorTotalRatear("");
  }

  if (!podeEditar) return null;

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Registrar compra</h2>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="descricaoCompraNova">Descrição</Label>
            <Input
              id="descricaoCompraNova"
              name="descricao"
              placeholder="Ex.: reposição de recria, lote de invernada..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fornecedorCompraNova">Fornecedor</Label>
            <Input id="fornecedorCompraNova" name="fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dataCompraNova">Data da compra</Label>
            <Input
              id="dataCompraNova"
              name="data"
              type="date"
              max={hojeISO}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prazoPagamentoCompraNova">Prazo de pagamento</Label>
            <Input
              id="prazoPagamentoCompraNova"
              name="prazoPagamento"
              type="date"
              value={prazoPagamento}
              onChange={(e) => setPrazoPagamento(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pagoCompraNova" name="pago" checked={pago} onCheckedChange={(v) => setPago(v === true)} />
            <Label htmlFor="pagoCompraNova">Pago</Label>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="responsavelCompraNova">Responsável</Label>
            <Input
              id="responsavelCompraNova"
              name="responsavel"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="observacoesCompraNova">Observações</Label>
            <Textarea
              id="observacoesCompraNova"
              name="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground">Adicionar animais à compra</h3>

          <div className="flex flex-wrap items-center gap-1">
            {Object.entries(rotulosEspecie).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setEspecie(value as Especie);
                  setCategoriaId("");
                }}
                className={cn(buttonVariants({ variant: especie === value ? "secondary" : "ghost", size: "sm" }))}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoArea
              htmlId="areaCompraItem"
              value={areaId}
              onValueChange={setAreaId}
              areas={areasLocais}
              localId={localId}
              onCriada={(a) => setAreasLocais((atual) => [...atual, a])}
            />
            <CampoCategoria
              htmlId="categoriaCompraItem"
              value={categoriaId}
              onValueChange={setCategoriaId}
              categorias={categoriasDaEspecie}
              categoriasIvz={categoriasIvz}
              especie={especie}
              localId={localId}
              onCriada={(c) => setCategoriasLocais((atual) => [...atual, c])}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoRaca
              htmlId="racaCompraItem"
              value={racaId}
              onValueChange={setRacaId}
              racas={racasLocais}
              localId={localId}
              onCriada={(r) => setRacasLocais((atual) => [...atual, r])}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="grauSangueCompraItem">Grau de sangue</Label>
              <Select
                value={grauSangue}
                onValueChange={(v) => setGrauSangue(v ?? "Desconhecido")}
                items={grausSangue.map((g) => ({ value: g, label: g }))}
              >
                <SelectTrigger id="grauSangueCompraItem" className="w-full">
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
          </div>

          {exigeRegistro(grauSangue) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="registroProvisorioCompraItem">Registro provisório</Label>
                <Input
                  id="registroProvisorioCompraItem"
                  value={registroProvisorio}
                  onChange={(e) => setRegistroProvisorio(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="registroDefinitivoCompraItem">Registro definitivo</Label>
                <Input
                  id="registroDefinitivoCompraItem"
                  value={registroDefinitivo}
                  onChange={(e) => setRegistroDefinitivo(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="precificarPorPesoCompra"
              checked={precificarPorPeso}
              onCheckedChange={(v) => setPrecificarPorPeso(v === true)}
            />
            <Label htmlFor="precificarPorPesoCompra">Precificar por peso (R$/kg)</Label>
          </div>
          {precificarPorPeso ? (
            <div className="flex flex-col gap-2 sm:max-w-52">
              <Label htmlFor="valorKgCompraItem">Valor por kg (R$)</Label>
              <Input
                id="valorKgCompraItem"
                type="number"
                step="0.01"
                value={valorKg}
                onChange={(e) => setValorKg(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:max-w-52">
              <Label htmlFor="valorUnitarioCompraItem">Valor por cabeça (R$)</Label>
              <Input
                id="valorUnitarioCompraItem"
                type="number"
                step="0.01"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantidadeCompraItem">Quantidade</Label>
              <Input
                id="quantidadeCompraItem"
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataNascimentoCompraItem">Data de nascimento</Label>
              <Input
                id="dataNascimentoCompraItem"
                type="date"
                max={hojeISO}
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pesoCompraItem">Peso (kg)</Label>
              <Input id="pesoCompraItem" type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </div>
          </div>

          {quantidade === "1" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nomeCompraItem">Nome</Label>
                <Input id="nomeCompraItem" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brincoCompraItem">Brinco</Label>
                <Input id="brincoCompraItem" value={brinco} onChange={(e) => setBrinco(e.target.value.toUpperCase())} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tatuagemCompraItem">Tatuagem</Label>
                <Input id="tatuagemCompraItem" value={tatuagem} onChange={(e) => setTatuagem(e.target.value)} />
              </div>
            </div>
          )}

          {categoriaSelecionada?.sexo === "macho" && (
            <div className="flex items-center gap-2">
              <Checkbox id="castradoCompraItem" checked={castrado} onCheckedChange={(v) => setCastrado(v === true)} />
              <Label htmlFor="castradoCompraItem">Castrado</Label>
            </div>
          )}

          {previaValor != null && (
            <p className="text-sm text-muted-foreground">Valor deste item: {formatarReais(previaValor)}</p>
          )}
          {erroItem && <p className="text-sm text-destructive">{erroItem}</p>}

          <div>
            <Button type="button" variant="outline" onClick={adicionarItem}>
              <Plus className="size-4" />
              Adicionar à lista
            </Button>
          </div>
        </div>

        {itens.length > 0 && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground">Animais desta compra ({totalAnimais})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{tituloItem(item)}</TableCell>
                    <TableCell>{item.categoriaDescricao}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.peso != null ? `${item.peso} kg` : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.valor != null ? formatarReais(item.valor * item.quantidade) : "—"}
                      {item.quantidade > 1 && item.valor != null && (
                        <span className="block text-xs text-muted-foreground">{formatarReais(item.valor)}/cabeça</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removerItem(item.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-sm font-normal text-muted-foreground">
                    {totalAnimais} animal(is)
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatarReais(totalValor)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>

            <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valorTotalRatearCompra">
                  Definir valor total {podeRatearPorPeso ? "(rateado por peso)" : "(dividido igual por cabeça)"}
                </Label>
                <CampoValorReais value={valorTotalRatear} onChange={setValorTotalRatear} className="w-40" />
              </div>
              <Button type="button" variant="outline" onClick={ratearTotal}>
                <Calculator className="size-4" />
                Ratear
              </Button>
            </div>
          </div>
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div>
          <Button type="button" disabled={emAndamento || itens.length === 0} onClick={concluirCompra}>
            {emAndamento ? "Registrando..." : `Concluir compra (${totalAnimais})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
