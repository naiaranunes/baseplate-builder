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
    const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing) {
      await admin.from("profiles").update({ is_approved: true, is_active: true }).eq("id", existing.id);
      return json({ status: "ja_cadastrado" });
    }
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: lid.nome },
      redirectTo: typeof redirect_to === "string" ? redirect_to : undefined,
    });
    if (error) return json({ error: error.message }, 400);
    if (data.user) {
      await admin.from("profiles").update({ is_approved: true, is_active: true }).eq("id", data.user.id);
    }
    return json({ status: "convidado" });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
