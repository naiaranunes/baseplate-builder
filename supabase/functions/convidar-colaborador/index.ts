import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { liderado_id, redirect_to } = await req.json();
    if (typeof liderado_id !== "string") return json({ error: "liderado_id obrigatório" }, 400);

    // RLS garante que só o líder do liderado (ou admin) o enxerga.
    const { data: lid } = await userClient.from("liderados").select("id, nome, email, gestor_id").eq("id", liderado_id).maybeSingle();
    if (!lid || lid.gestor_id === undefined) return json({ error: "Liderado não encontrado" }, 404);
    const email = String(lid.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "E-mail inválido" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing, error: existingError } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existingError) return json({ error: `Não foi possível verificar o cadastro: ${existingError.message}` }, 500);
    if (existing) {
      const { error: profileError } = await admin.from("profiles").update({ is_approved: true, is_active: true }).eq("id", existing.id);
      if (profileError) return json({ error: `Não foi possível ativar o cadastro: ${profileError.message}` }, 500);
      return json({ status: "ja_cadastrado" });
    }

    const appUrl = Deno.env.get("APP_URL") ?? "https://baseplate-builder.lovable.app";
    const configuredOrigin = new URL(appUrl).origin;
    const redirectTo = typeof redirect_to === "string" ? new URL(redirect_to) : new URL("/accept-invite", appUrl);
    const isLocalRedirect = redirectTo.protocol === "http:" && redirectTo.hostname === "localhost";
    if (
      redirectTo.pathname !== "/accept-invite" ||
      (redirectTo.origin !== configuredOrigin && !isLocalRedirect)
    ) {
      return json({ error: "URL de aceite de convite inválida" }, 400);
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: lid.nome },
      redirectTo: redirectTo.toString(),
    });
    if (error) return json({ error: error.message }, 400);
    if (!data.user) return json({ error: "O convite foi processado sem retornar o usuário." }, 500);

    const { data: profile, error: profileLookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileLookupError) {
      return json({ error: `Não foi possível validar o perfil convidado: ${profileLookupError.message}` }, 500);
    }

    const profileWrite = profile
      ? await admin.from("profiles").update({ is_approved: true, is_active: true }).eq("id", data.user.id)
      : await admin.from("profiles").insert({
        id: data.user.id,
        full_name: lid.nome,
        email,
        is_approved: true,
        is_active: true,
      });
    if (profileWrite.error) {
      return json({ error: `Convite criado, mas não foi possível preparar o perfil: ${profileWrite.error.message}` }, 500);
    }

    const { data: role, error: roleLookupError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();
    if (roleLookupError) {
      return json({ error: `Convite criado, mas não foi possível validar o acesso: ${roleLookupError.message}` }, 500);
    }
    if (!role) {
      const { error: roleInsertError } = await admin
        .from("user_roles")
        .insert({ user_id: data.user.id, role: "agent" });
      if (roleInsertError) {
        return json({ error: `Convite criado, mas não foi possível configurar o acesso: ${roleInsertError.message}` }, 500);
      }
    }

    return json({ status: "convidado" });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
