import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUser, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Portao de autenticacao (revisao 26/08/2026): sem isto a function respondia a
  // um POST sem credencial nenhuma. Ver supabase/functions/_shared/auth.ts.
  try {
    await requireUser(req);
  } catch (e) {
    const resp = unauthorizedResponse(e, corsHeaders);
    if (resp) return resp;
    throw e;
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ allowed: false, message: "Email inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // First user always allowed
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    if (!count || count === 0) {
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfgRows } = await supabase
      .from("project_config")
      .select("key, value")
      .in("key", ["restrict_signup_by_domain", "allowed_email_domains"]);

    const cfg: Record<string, string> = {};
    (cfgRows ?? []).forEach((r: any) => { cfg[r.key] = r.value; });

    if (cfg.restrict_signup_by_domain !== "true") {
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    const allowed = (cfg.allowed_email_domains ?? "")
      .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);

    const isAllowed = allowed.some((d) => domain === d || domain.endsWith("." + d));

    if (!isAllowed) {
      return new Response(JSON.stringify({
        allowed: false,
        message: "O domínio do seu email não é permitido para cadastro nesta plataforma.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ allowed: false, message: "Erro de validação." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
