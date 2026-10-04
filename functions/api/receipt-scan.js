const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_BODY_BYTES = 2_000_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Origem nao permitida." }, 403);
  if (!request.headers.get("Content-Type")?.includes("application/json")) return json({ error: "Formato invalido." }, 400);
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Entre no app para escanear recibos." }, 401);

  const supabaseUrl = env.SUPABASE_URL || env.PONTE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.PONTE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey || !env.AI) return json({ error: "O scan de recibos ainda nao foi configurado no servidor." }, 503);
  const auth = await fetch(supabaseUrl.replace(/\/$/, "") + "/auth/v1/user", {
    headers: { Authorization: authorization, apikey: anonKey }, signal: AbortSignal.timeout(10000)
  }).catch(() => null);
  if (!auth?.ok) return json({ error: "Sua sessao expirou. Entre novamente no Nekuma." }, 401);

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).length > MAX_BODY_BYTES) return json({ error: "A imagem ficou grande demais. Fotografe somente o recibo." }, 413);
  let body;
  try { body = JSON.parse(bodyText); } catch { return json({ error: "Dados invalidos." }, 400); }
  const image = String(body?.image || "");
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) return json({ error: "Envie uma imagem JPG, PNG ou WebP." }, 400);

  const prompt = `Leia este recibo de compra, inclusive se estiver em japones ou portugues. Extraia somente os dados essenciais e retorne SOMENTE um objeto JSON valido, sem markdown ou explicacoes:
{"merchant":"","date":"YYYY-MM-DD ou vazio","currency":"JPY|BRL|USD|EUR","total":0,"paymentMethod":"cash|card|electronic_money|qr_wallet|bank_transfer|unknown","category":"","confidence":0}

Regras para recibos japoneses:
- merchant: nome ou logotipo da loja no topo.
- total: valor junto de 合計, 総合計, お会計 ou TOTAL.
- Nunca use como total os valores de 小計 (subtotal), 内税/消費税 (imposto), お預り (valor entregue), お釣り (troco), saldo ou pontos.
- paymentMethod cash apenas quando houver 現金 ou a combinacao お預り e お釣り; card para クレジット/カード; electronic_money para ICOCA, Suica, PASMO e similares; qr_wallet para PayPay, Merpay ou outro QR; bank_transfer para transferencia; caso nao esteja impresso use unknown.
- Para recarga de transporte, use categoria "Recarga de transporte". Para mercado, farmacia, restaurante e outras compras, use uma categoria financeira curta em portugues.
- Nao invente dados ilegíveis. Use numeros sem simbolos e confidence entre 0 e 1. Itens, subtotal e impostos nao sao necessarios.`;
  let output;
  try {
    output = await env.AI.run(env.RECEIPT_AI_MODEL || VISION_MODEL, {
      messages: [
        { role: "system", content: "Voce extrai dados de recibos e responde exclusivamente com um unico objeto JSON valido." },
        { role: "user", content: prompt }
      ],
      image,
      max_tokens: 650,
      temperature: 0
    });
  } catch (error) {
    return json({ error: "Nao foi possivel ler o recibo agora. Confira se a licenca do modelo de visao foi aceita no Cloudflare." }, 502);
  }
  const text = String(output?.response || output?.description || output?.result?.response || "").trim();
  let receipt = parseModelJson(text);
  if (!receipt && text) receipt = await repairModelJson(env, text);
  if (!receipt) return json({ error: "A IA leu o recibo, mas nao conseguiu organizar os dados. Tente novamente." }, 502);
  const sanitized = sanitizeReceipt(receipt);
  if (!sanitized.merchant && sanitized.total <= 0) return json({ error: "A leitura nao encontrou loja nem valor total. Confira o enquadramento e tente novamente." }, 422);
  return json({ receipt: sanitized });
}

function parseModelJson(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const candidate = cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function repairModelJson(env, modelText) {
  const repairPrompt = `Converta o texto abaixo em um unico objeto JSON valido. Nao altere valores nem invente dados. Use exatamente estas chaves:
merchant,date,currency,total,paymentMethod,category,confidence.
paymentMethod deve ser cash, card, electronic_money, qr_wallet, bank_transfer ou unknown. Responda somente com JSON.\n\n${String(modelText).slice(0, 6000)}`;
  try {
    const repaired = await env.AI.run(env.RECEIPT_AI_MODEL || VISION_MODEL, {
      messages: [
        { role: "system", content: "Voce corrige JSON sem modificar o significado dos dados." },
        { role: "user", content: repairPrompt }
      ],
      max_tokens: 650,
      temperature: 0
    });
    return parseModelJson(repaired?.response || repaired?.description || repaired?.result?.response || "");
  } catch {
    return null;
  }
}

function sanitizeReceipt(value) {
  const allowedCurrencies = new Set(["JPY", "BRL", "USD", "EUR"]);
  const money = (number) => Number.isFinite(Number(number)) ? Math.max(0, Number(number)) : 0;
  const source = value?.receipt && typeof value.receipt === "object" ? value.receipt : value;
  const currency = String(source?.currency || "JPY").toUpperCase();
  const rawMethod = String(source?.paymentMethod || source?.payment_method || "unknown").toLowerCase();
  const paymentAliases = {
    cash: "cash", dinheiro: "cash", "現金": "cash",
    card: "card", credit_card: "card", credit: "card", cartao: "card", "カード": "card", "クレジット": "card",
    electronic_money: "electronic_money", e_money: "electronic_money", icoca: "electronic_money", suica: "electronic_money", pasmo: "electronic_money",
    qr_wallet: "qr_wallet", paypay: "qr_wallet", merpay: "qr_wallet", wallet: "qr_wallet",
    bank_transfer: "bank_transfer", transfer: "bank_transfer", transferencia: "bank_transfer",
    unknown: "unknown", "": "unknown"
  };
  return {
    merchant: String(source?.merchant || source?.store || source?.merchant_name || "").slice(0, 120),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(source?.date || "")) ? source.date : "",
    currency: allowedCurrencies.has(currency) ? currency : "JPY",
    total: money(source?.total ?? source?.amount ?? source?.grand_total),
    paymentMethod: paymentAliases[rawMethod] || "unknown",
    category: String(source?.category || "Outros").slice(0, 80),
    confidence: Math.min(1, Math.max(0, Number(source?.confidence) || 0)),
    items: []
  };
}
