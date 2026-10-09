import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Apenas administradores podem excluir usuários" }, 403);

    const body = await req.json().catch(() => ({}));
    const target = body?.user_id;
    if (typeof target !== "string" || !/^[0-9a-f-]{36}$/i.test(target)) return json({ error: "user_id inválido" }, 400);
    if (target === user.id) return json({ error: "Você não pode excluir a própria conta" }, 400);

    const { data: prof } = await admin.from("profiles").select("email").eq("id", target).maybeSingle();
    const { error } = await admin.auth.admin.deleteUser(target);
    if (error) return json({ error: error.message }, 400);
    // Remove também o cadastro de liderado ligado a esse e-mail quando não houver entregas.
    if (prof?.email) {
      const { data: lids } = await admin.from("liderados").select("id").ilike("email", prof.email);
      for (const l of lids ?? []) {
        const { count } = await admin.from("entregas").select("id", { count: "exact", head: true }).eq("liderado_cadastro_id", l.id);
        if ((count ?? 0) > 0) await admin.from("liderados").update({ ativo: false }).eq("id", l.id);
        else await admin.from("liderados").delete().eq("id", l.id);
      }
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
