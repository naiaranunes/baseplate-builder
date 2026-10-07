import { requireUser, unauthorizedResponse } from "../_shared/auth.ts";
// Análise de saúde de uma meta usando Lovable AI Gateway.
// Recebe contexto completo da meta + últimos lançamentos. Retorna diagnóstico,
// 3 ações recomendadas, previsão final e veredicto vai_bater.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Lanc = { data: string; valor: number };

type Input = {
  meta_id: string;
  meta_nome: string;
  area?: string;
  unidade: string;
  periodicidade: string;
  valor_atual: number;
  valor_alvo: number;
  data_inicio: string;
  data_fim: string;
  is_inverse: boolean;
  historico: Lanc[];
};

type Output = {
  diagnostico: string;
  acoes: { titulo: string; contexto: string }[];
  previsao_final: number;
  vai_bater: boolean;
};

const SYSTEM_PROMPT = `Você é um analista de performance especialista em OKRs e KPIs.
Receberá os dados de uma meta (nome, área, alvo, atual, datas, periodicidade, se é inversa), o histórico de lançamentos.

Responda APENAS com um JSON válido (sem markdown, sem texto antes/depois), com este formato exato:
{
  "diagnostico": "2 a 3 parágrafos diretos em português do Brasil explicando a saúde da meta, ritmo, sazonalidade visível, principais riscos",
  "acoes": [
    {"titulo": "Ação curta (até 80 caracteres)", "contexto": "1 a 2 frases com o porquê e como executar"},
    {"titulo": "...", "contexto": "..."},
    {"titulo": "...", "contexto": "..."}
  ],
  "previsao_final": número (estimativa do valor final na data_fim baseada na tendência),
  "vai_bater": boolean (true se a previsao_final >= valor_alvo ou, em meta inversa, <= valor_alvo)
}

Regras:
- SEMPRE 3 ações (nem mais nem menos).
- Use linguagem executiva, sem jargão de IA.
- Em meta inversa (menor é melhor): trate a redução em direção ao alvo como o "progresso" positivo.
- Nunca invente dados além do histórico fornecido.
- Sugira orientações de acompanhamento com base nos dados da entrega. Não proponha criar planos de ação.`;


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Portao de autenticacao (revisao 26/08/2026): sem isto esta function respondia
  // a um POST sem credencial nenhuma. Ver supabase/functions/_shared/auth.ts.
  try {
    await requireUser(req);
  } catch (_authErr) {
    const _resp = unauthorizedResponse(_authErr, corsHeaders);
    if (_resp) return _resp;
    throw _authErr;
  }


  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ error: "LOVABLE_API_KEY não configurada no projeto." }, 500);
    }

    const input = (await req.json()) as Input;
    if (!input?.meta_nome || !Number.isFinite(input.valor_alvo)) {
      return json({ error: "Payload inválido — meta_nome e valor_alvo são obrigatórios." }, 400);
    }

    const historicoTxt =
      input.historico?.length
        ? input.historico
            .map((l) => `- ${l.data}: ${l.valor}`)
            .join("\n")
        : "(sem lançamentos registrados ainda)";

    const userPrompt = `Meta: ${input.meta_nome}
Área: ${input.area ?? "—"}
Periodicidade: ${input.periodicidade}
Unidade: ${input.unidade}
Tipo: ${input.is_inverse ? "INVERSA (menor é melhor)" : "Direta (maior é melhor)"}
Valor alvo: ${input.valor_alvo}
Valor atual: ${input.valor_atual}
Janela: ${input.data_inicio} → ${input.data_fim}

Histórico de lançamentos:
${historicoTxt}

Hoje é ${new Date().toISOString().slice(0, 10)}.

Gere a análise no formato JSON especificado.`;


    const model = Deno.env.get("LOVABLE_AI_MODEL") ?? "google/gemini-2.5-flash";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      if (aiResp.status === 429) {
        return json({ error: "Limite de requisições atingido — tente novamente em alguns segundos." }, 429);
      }
      if (aiResp.status === 402) {
        return json({ error: "Créditos do Lovable AI Gateway esgotados." }, 402);
      }
      return json({ error: `AI Gateway falhou: ${text.slice(0, 200)}` }, 502);
    }

    const data = await aiResp.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") {
      return json({ error: "Resposta vazia do AI Gateway." }, 502);
    }

    const parsed = parseJson(raw);
    if (!parsed) {
      return json({ error: "Não consegui interpretar a resposta da IA (JSON inválido).", raw }, 502);
    }

    const result = validate(parsed);
    if (!result) {
      return json({ error: "Resposta da IA fora do schema esperado.", raw: parsed }, 502);
    }

    return json(result, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: `Erro inesperado: ${msg}` }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseJson(raw: string): unknown {
  // remove cercas markdown se vierem
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // tenta extrair o primeiro objeto JSON do texto
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function validate(p: unknown): Output | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const diagnostico = typeof o.diagnostico === "string" ? o.diagnostico : null;
  const acoesRaw = Array.isArray(o.acoes) ? o.acoes : null;
  if (!diagnostico || !acoesRaw || acoesRaw.length < 1) return null;

  const acoes = acoesRaw
    .slice(0, 3)
    .filter((a: unknown): a is { titulo: string; contexto: string } => {
      if (!a || typeof a !== "object") return false;
      const ao = a as Record<string, unknown>;
      return typeof ao.titulo === "string" && typeof ao.contexto === "string";
    })
    .map((a) => ({ titulo: a.titulo, contexto: a.contexto }));

  if (acoes.length === 0) return null;
  while (acoes.length < 3) {
    acoes.push({
      titulo: "Revisar premissas com o time",
      contexto: "Aprofundar análise junto ao responsável pela meta para identificar próximas alavancas.",
    });
  }

  const previsao = typeof o.previsao_final === "number" ? o.previsao_final : 0;
  const vaiBater = typeof o.vai_bater === "boolean" ? o.vai_bater : false;

  return {
    diagnostico,
    acoes,
    previsao_final: previsao,
    vai_bater: vaiBater,
  };
}
