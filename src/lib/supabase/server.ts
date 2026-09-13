import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Components não podem escrever cookies — o middleware já cuida de
// renovar a sessão a cada request, então o catch aqui é só pra evitar erro
// quando essa função é chamada de dentro de um Server Component puro.
export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesParaDefinir) {
          try {
            for (const { name, value, options } of cookiesParaDefinir) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // chamado de um Server Component — o middleware renova a sessão
          }
        },
      },
    },
  );
}
