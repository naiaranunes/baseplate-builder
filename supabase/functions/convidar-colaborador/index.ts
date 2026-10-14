import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceRoleKey) return json({ error: "Supabase não configurado." }, 500);

    const authorization = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Não autenticado." }, 401);

    let body: { liderado_id?: unknown; redirect_to?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Corpo da requisição inválido." }, 400);
    }
    if (typeof body.liderado_id !== "string") return json({ error: "liderado_id obrigatório." }, 400);

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [{ data: callerRole, error: roleError }, { data: callerProfile, error: callerProfileError }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      admin.from("profiles").select("is_active, is_approved").eq("id", user.id).maybeSingle(),
    ]);
    if (roleError) return json({ error: `Não foi possível validar o perfil de acesso: ${roleError.message}` }, 500);
    if (callerProfileError) return json({ error: `Não foi possível validar a conta: ${callerProfileError.message}` }, 500);
    if (!callerRole || !["admin", "supervisor"].includes(callerRole.role)) {
      return json({ error: "Apenas administradores e líderes podem cadastrar membros da equipe." }, 403);
    }
    if (!callerProfile?.is_active || !callerProfile.is_approved) {
      return json({ error: "Sua conta não está ativa e aprovada." }, 403);
    }

    const { data: lid, error: lideradoError } = await userClient
      .from("liderados")
      .select("id, nome, email, gestor_id, perfil_acesso, usuario_id, ativo")
      .eq("id", body.liderado_id)
      .maybeSingle();
    if (lideradoError) return json({ error: `Não foi possível carregar o cadastro: ${lideradoError.message}` }, 500);
    if (!lid) return json({ error: "Colaborador não encontrado." }, 404);
    if (callerRole.role === "supervisor" && lid.gestor_id !== user.id) {
      return json({ error: "Líderes só podem convidar pessoas da própria equipe." }, 403);
    }
    if (!lid.ativo) return json({ error: "Ative o cadastro antes de enviar o convite." }, 400);
    if (lid.perfil_acesso !== "agent" && lid.perfil_acesso !== "supervisor") {
      return json({ error: "O perfil de acesso selecionado é inválido." }, 400);
    }
    if (callerRole.role === "supervisor" && lid.perfil_acesso !== "agent") {
      return json({ error: "Líderes só podem cadastrar colaboradores." }, 403);
    }

    const email = String(lid.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "E-mail inválido." }, 400);

    const appUrl = Deno.env.get("APP_URL") ?? "https://baseplate-builder.lovable.app";
    let redirectTo: URL;
    try {
      redirectTo = typeof body.redirect_to === "string"
        ? new URL(body.redirect_to)
        : new URL("/accept-invite", appUrl);
    } catch {
      return json({ error: "URL de aceite de convite inválida." }, 400);
    }
    const configuredOrigin = new URL(appUrl).origin;
    const isLocalRedirect = redirectTo.protocol === "http:" && redirectTo.hostname === "localhost";
    if (
      !["/", "/accept-invite"].includes(redirectTo.pathname)
      || (redirectTo.origin !== configuredOrigin && !isLocalRedirect)
    ) {
      return json({ error: "URL de aceite de convite inválida." }, 400);
    }
    if (redirectTo.pathname === "/") redirectTo.pathname = "/accept-invite";

    const { data: existing, error: existingError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingError) return json({ error: `Não foi possível verificar o cadastro: ${existingError.message}` }, 500);

    let targetUserId: string;
    let status: "convidado" | "ja_cadastrado";
    if (existing) {
      targetUserId = existing.id;
      status = "ja_cadastrado";
      if (targetUserId === user.id) return json({ error: "Você não pode cadastrar sua própria conta como liderado." }, 400);

      const { data: existingRole, error: existingRoleError } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (existingRoleError) return json({ error: `Não foi possível validar o perfil existente: ${existingRoleError.message}` }, 500);
      if (existingRole?.role === "admin") {
        return json({ error: "Uma conta de administrador não pode ser vinculada como colaborador." }, 409);
      }
      if (callerRole.role === "supervisor" && existingRole?.role === "supervisor") {
        return json({ error: "Apenas o administrador pode alterar o perfil de um líder." }, 403);
      }

      const { data: linkedElsewhere, error: linkLookupError } = await admin
        .from("liderados")
        .select("id")
        .eq("usuario_id", targetUserId)
        .neq("id", lid.id)
        .maybeSingle();
      if (linkLookupError) return json({ error: `Não foi possível validar o vínculo da conta: ${linkLookupError.message}` }, 500);
      if (linkedElsewhere) {
        return json({ error: "Esta conta já está vinculada a outro cadastro de equipe." }, 409);
      }

      const { error: profileError } = await admin
        .from("profiles")
        .update({ is_approved: true, is_active: true })
        .eq("id", targetUserId);
      if (profileError) return json({ error: `Não foi possível ativar o cadastro: ${profileError.message}` }, 500);

      const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(targetUserId);
      if (authUserError) return json({ error: `Não foi possível validar o convite existente: ${authUserError.message}` }, 500);
      if (!authUserData.user) return json({ error: "A conta existente não foi encontrada no serviço de autenticação." }, 404);
      if (!authUserData.user.email_confirmed_at) {
        const { error: resendError } = await admin.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: redirectTo.toString() },
        });
        if (resendError) return json({ error: `Não foi possível reenviar o convite: ${resendError.message}` }, 400);
        status = "convidado";
      }
    } else {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: lid.nome },
        redirectTo: redirectTo.toString(),
      });
      if (error) return json({ error: error.message }, 400);
      if (!data.user) return json({ error: "O convite foi processado sem retornar o usuário." }, 500);
      targetUserId = data.user.id;
      status = "convidado";

      const { data: profile, error: profileLookupError } = await admin
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle();
      if (profileLookupError) {
        return json({ error: `Convite criado, mas não foi possível validar o perfil: ${profileLookupError.message}` }, 500);
      }

      const profileWrite = profile
        ? await admin.from("profiles").update({ is_approved: true, is_active: true }).eq("id", targetUserId)
        : await admin.from("profiles").insert({
          id: targetUserId,
          full_name: lid.nome,
          email,
          is_approved: true,
          is_active: true,
        });
      if (profileWrite.error) {
        return json({ error: `Convite criado, mas não foi possível preparar o perfil: ${profileWrite.error.message}` }, 500);
      }
    }

    const { error: deleteRolesError } = await admin.from("user_roles").delete().eq("user_id", targetUserId);
    if (deleteRolesError) {
      return json({ error: `Não foi possível atualizar o perfil de acesso: ${deleteRolesError.message}` }, 500);
    }
    const { error: insertRoleError } = await admin.from("user_roles").insert({
      user_id: targetUserId,
      role: lid.perfil_acesso,
    });
    if (insertRoleError) {
      return json({ error: `Não foi possível configurar o perfil de acesso: ${insertRoleError.message}` }, 500);
    }

    const { error: linkError } = await admin
      .from("liderados")
      .update({ usuario_id: targetUserId })
      .eq("id", lid.id);
    if (linkError) return json({ error: `Conta pronta, mas não foi possível vincular o cadastro à equipe: ${linkError.message}` }, 500);

    return json({ status });
  } catch (error) {
    console.error("[convidar-colaborador]", error);
    return json({ error: (error as Error).message || "Erro ao convidar usuário." }, 500);
  }
});
