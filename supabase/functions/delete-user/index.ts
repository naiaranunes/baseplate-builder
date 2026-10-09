import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase não configurado para excluir usuários." }, 500);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Não autorizado." }, 401);

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerResult, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerResult.user) return jsonResponse({ error: "Não autorizado." }, 401);

  const { data: callerRole, error: roleError } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", callerResult.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError) return jsonResponse({ error: "Não foi possível validar suas permissões." }, 500);
  if (!callerRole) return jsonResponse({ error: "Apenas administradores podem excluir usuários." }, 403);

  let body: { user_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo da requisição inválido." }, 400);
  }

  const targetUserId = typeof body.user_id === "string" ? body.user_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
    return jsonResponse({ error: "Identificador de usuário inválido." }, 400);
  }
  if (targetUserId === callerResult.user.id) {
    return jsonResponse({ error: "Você não pode excluir sua própria conta." }, 400);
  }

  const { data: targetRole, error: targetRoleError } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", targetUserId)
    .eq("role", "admin")
    .maybeSingle();
  if (targetRoleError) return jsonResponse({ error: "Não foi possível validar o usuário." }, 500);

  if (targetRole) {
    const { data: admins, error: adminsError } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (adminsError) return jsonResponse({ error: "Não foi possível validar os administradores." }, 500);

    const adminIds = (admins ?? []).map((row) => row.user_id);
    const { count: activeAdminCount, error: profilesError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("id", adminIds)
      .eq("is_active", true)
      .eq("is_approved", true);
    if (profilesError) return jsonResponse({ error: "Não foi possível validar os administradores ativos." }, 500);

    const { data: targetProfile, error: targetProfileError } = await admin
      .from("profiles")
      .select("is_active, is_approved")
      .eq("id", targetUserId)
      .maybeSingle();
    if (targetProfileError) return jsonResponse({ error: "Não foi possível validar o usuário." }, 500);
    const targetIsActiveAdmin = !targetProfile || (targetProfile.is_active && targetProfile.is_approved);

    if (targetIsActiveAdmin && (activeAdminCount ?? 0) <= 1) {
      return jsonResponse({ error: "O último administrador não pode ser excluído." }, 409);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
  if (deleteError) return jsonResponse({ error: deleteError.message }, 500);
  return jsonResponse({ success: true });
});
