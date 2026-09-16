"use client";

import { HistoricoCompras } from "./historico-compras";
import { FormularioCompra } from "./formulario-compra";
import type { CategoriaIvz, Compra, OpcaoArea, OpcaoCategoria, OpcaoRaca } from "./page";

type Props = {
  localId: string;
  compras: Compra[];
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  categoriasIvz: CategoriaIvz[];
  podeEditar: boolean;
};

export function PaginaCompras({ localId, compras, areas, categorias, racas, categoriasIvz, podeEditar }: Props) {
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">Compra de Animais</h1>
        <p className="text-sm text-muted-foreground">
          Registra a entrada de animais comprados de fora — cada compra pode juntar vários animais, com preço por
          cabeça, por peso, ou fechado depois por um total rateado.
        </p>
      </div>
      <HistoricoCompras localId={localId} compras={compras} podeEditar={podeEditar} />
      <FormularioCompra
        localId={localId}
        areas={areas}
        categorias={categorias}
        racas={racas}
        categoriasIvz={categoriasIvz}
        podeEditar={podeEditar}
      />
    </>
  );
}
