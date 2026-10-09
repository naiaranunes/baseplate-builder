import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Serviço de convites não está configurado." }, 500);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Não autorizado." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length).trim();
  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData.user) return json({ error: "Não autorizado." }, 401);

  let body: { liderado_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const lideradoId = typeof body.liderado_id === "string" ? body.liderado_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lideradoId)) {
    return json({ error: "Identificador de colaborador inválido." }, 400);
  }

  const { data: roles, error: rolesError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerData.user.id)
    .in("role", ["admin", "supervisor"]);
  if (rolesError) return json({ error: "Não foi possível validar suas permissões." }, 500);
  const callerRoles = (roles ?? []).map((row) => row.role);
  if (callerRoles.length === 0) return json({ error: "Somente gestores podem convidar colaboradores." }, 403);

  const { data: liderado, error: lideradoError } = await admin
    .from("liderados")
    .select("id, gestor_id, nome, email, ativo")
    .eq("id", lideradoId)
    .maybeSingle();
  if (lideradoError) return json({ error: "Não foi possível carregar o colaborador." }, 500);
  if (!liderado) return json({ error: "Colaborador não encontrado." }, 404);

  const isAdmin = callerRoles.includes("admin");
  if (!isAdmin && (!callerRoles.includes("supervisor") || liderado.gestor_id !== callerData.user.id)) {
    return json({ error: "Você não tem permissão para convidar este colaborador." }, 403);
  }
  if (!liderado.ativo) return json({ error: "Não é possível convidar um colaborador inativo." }, 400);
  if (!liderado.email) return json({ error: "O colaborador não possui um e-mail cadastrado." }, 400);

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(liderado.email, {
    data: { full_name: liderado.nome },
  });
  if (inviteError) {
    if (inviteError.message.toLowerCase().includes("already registered")) {
      return json({ status: "already_registered" });
    }
    return json({ error: `Não foi possível enviar o convite: ${inviteError.message}` }, 502);
  }

  return json({ status: "sent" });
});
