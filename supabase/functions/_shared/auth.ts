// Portão de autenticação das edge functions.
//
// Estas functions são publicadas com verify_jwt=false (senão o scheduler, que
// chama por secret, não passaria). Sem uma checagem por dentro elas ficam ABERTAS
// na internet: em 26/08/2026 um POST sem credencial nenhuma rodou fetch-rss por
// inteiro (HTTP 200) e fez generate-post/suggest-* chegarem à chamada de LLM,
// queimando cota de IA na conta do dono do projeto.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export class UnauthorizedError extends Error {
  constructor(message = "unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Exige um usuário autenticado (bearer JWT do Supabase) e devolve o id dele.
 * Aceita também a chamada interna do scheduler, que se identifica por secret.
 */
export async function requireUser(req: Request): Promise<{ userId: string | null; viaScheduler: boolean }> {
  const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
  const sentSecret = req.headers.get("x-scheduler-secret");
  if (schedulerSecret && sentSecret && sentSecret === schedulerSecret) {
    return { userId: null, viaScheduler: true };
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) throw new UnauthorizedError();

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new UnauthorizedError();

  // Chamada interna servidor-a-servidor: o scheduler chama fetch-rss e
  // generate-post com a service role key. Ela é segredo de servidor, então vale
  // como credencial — mas só por igualdade exata, nunca por "parece um token".
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { userId: null, viaScheduler: true };
  }

  // A publishable/anon key não é JWT de usuário: se vier ela, não é autenticação.
  if (token.split(".").length !== 3) throw new UnauthorizedError();

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (anonKey && token === anonKey) throw new UnauthorizedError();

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !anon) throw new Error("Supabase não configurado na edge function");

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) throw new UnauthorizedError();
  return { userId: data.user.id, viaScheduler: false };
}

/** Exige usuário autenticado E papel admin. */
export async function requireAdmin(req: Request): Promise<string | null> {
  const { userId, viaScheduler } = await requireUser(req);
  if (viaScheduler) return null;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId!)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new UnauthorizedError("forbidden: admin role required");
  return userId;
}

export function unauthorizedResponse(err: unknown, corsHeaders: Record<string, string>): Response | null {
  if (err instanceof UnauthorizedError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.message.startsWith("forbidden") ? 403 : 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}
