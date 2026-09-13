import { buscarLocalAtual } from "@/lib/local";

export default async function InicioLocalPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-lg font-medium">{local.nome}</h1>
      <p className="text-sm text-muted-foreground">
        Comece cadastrando as Áreas e Categorias do local no menu acima.
      </p>
    </div>
  );
}
