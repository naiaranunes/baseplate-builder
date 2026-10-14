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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handleUserDeletion(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase não configurado para excluir usuários." }, 500);
  }

  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Não autorizado." }, 401);

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerResult, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerResult.user) return jsonResponse({ error: "Não autorizado." }, 401);
  const callerId = callerResult.user.id;

  const { data: callerRole, error: callerRoleError } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (callerRoleError) return jsonResponse({ error: "Não foi possível validar suas permissões." }, 500);
  if (!callerRole) return jsonResponse({ error: "Apenas administradores podem excluir usuários." }, 403);

  let body: { user_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo da requisição inválido." }, 400);
  }

  const targetUserId = typeof body.user_id === "string" ? body.user_id : "";
  if (!UUID_PATTERN.test(targetUserId)) {
    return jsonResponse({ error: "Identificador de usuário inválido." }, 400);
  }
  if (targetUserId === callerId) {
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

  const [{ data: authUserResult, error: authUserError }, { data: profile, error: profileError }] =
    await Promise.all([
      admin.auth.admin.getUserById(targetUserId),
      admin.from("profiles").select("email").eq("id", targetUserId).maybeSingle(),
    ]);
  if (authUserError || !authUserResult.user) {
    return jsonResponse({ error: authUserError?.message ?? "Usuário não encontrado." }, 404);
  }
  if (profileError) return jsonResponse({ error: "Não foi possível carregar o perfil do usuário." }, 500);

  const emails = Array.from(new Set([authUserResult.user.email, profile?.email]
    .filter((email): email is string => !!email)
    .map((email) => email.trim().toLowerCase())));

  const [{ data: byUser, error: byUserError }, ...emailMatches] = await Promise.all([
    admin.from("liderados").select("id").eq("usuario_id", targetUserId),
    ...emails.map((email) => admin.from("liderados").select("id").eq("email", email)),
  ]);
  if (byUserError) return jsonResponse({ error: "Não foi possível localizar o cadastro na equipe." }, 500);
  const emailError = emailMatches.find((result) => result.error)?.error;
  if (emailError) return jsonResponse({ error: "Não foi possível localizar o cadastro por e-mail." }, 500);

  const lideradoIds = Array.from(new Set([
    ...(byUser ?? []).map((row) => row.id),
    ...emailMatches.flatMap((result) => (result.data ?? []).map((row) => row.id)),
  ]));

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(targetUserId);
  if (deleteAuthError) return jsonResponse({ error: deleteAuthError.message }, 500);

  if (lideradoIds.length) {
    const { error: detachDeliveriesError } = await admin
      .from("entregas")
      .update({ liderado_cadastro_id: null })
      .in("liderado_cadastro_id", lideradoIds);
    if (detachDeliveriesError) {
      return jsonResponse({ error: `Conta excluída, mas não foi possível preservar os vínculos das entregas: ${detachDeliveriesError.message}` }, 500);
    }

    const { error: deleteTeamRecordsError } = await admin
      .from("liderados")
      .delete()
      .in("id", lideradoIds);
    if (deleteTeamRecordsError) {
      return jsonResponse({ error: `Conta excluída, mas não foi possível remover o cadastro da equipe: ${deleteTeamRecordsError.message}` }, 500);
    }
  }

  const { error: transferTeamError } = await admin
    .from("liderados")
    .update({ gestor_id: callerId })
    .eq("gestor_id", targetUserId);
  if (transferTeamError) {
    return jsonResponse({ error: `Conta excluída, mas não foi possível transferir a equipe ao administrador: ${transferTeamError.message}` }, 500);
  }

  const { error: deleteProfileError } = await admin.from("profiles").delete().eq("id", targetUserId);
  if (deleteProfileError) {
    return jsonResponse({ error: `Conta excluída, mas não foi possível limpar o perfil: ${deleteProfileError.message}` }, 500);
  }

  const { error: deleteRolesError } = await admin.from("user_roles").delete().eq("user_id", targetUserId);
  if (deleteRolesError) {
    return jsonResponse({ error: `Conta excluída, mas não foi possível limpar as permissões: ${deleteRolesError.message}` }, 500);
  }

  return jsonResponse({ success: true });
}
