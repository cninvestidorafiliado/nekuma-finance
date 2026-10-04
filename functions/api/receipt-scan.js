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

  const prompt = `Leia este recibo de compra, inclusive se estiver em japones ou portugues. Retorne SOMENTE JSON valido, sem markdown, no formato:
{"merchant":"","date":"YYYY-MM-DD ou vazio","currency":"JPY|BRL|USD|EUR","subtotal":0,"tax":0,"discount":0,"total":0,"paymentMethod":"","category":"","confidence":0,"items":[{"name":"","quantity":1,"unitPrice":0,"total":0,"category":""}]}
Regras: nao invente texto ilegivel; confidence deve ser de 0 a 1; use numeros sem simbolos; category deve ser uma categoria financeira curta; a soma pode divergir do total e deve preservar os valores impressos.`;
  let output;
  try {
    output = await env.AI.run(env.RECEIPT_AI_MODEL || VISION_MODEL, { prompt, image, max_tokens: 1800, temperature: 0.1 });
  } catch (error) {
    return json({ error: "Nao foi possivel ler o recibo agora. Confira se a licenca do modelo de visao foi aceita no Cloudflare." }, 502);
  }
  const text = String(output?.response || output?.description || output?.result?.response || "").trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return json({ error: "A leitura nao retornou dados estruturados. Tente uma foto mais nitida." }, 502);
  let receipt;
  try { receipt = JSON.parse(match[0]); } catch { return json({ error: "Nao consegui interpretar a leitura. Tente novamente." }, 502); }
  return json({ receipt: sanitizeReceipt(receipt) });
}

function sanitizeReceipt(value) {
  const allowedCurrencies = new Set(["JPY", "BRL", "USD", "EUR"]);
  const money = (number) => Number.isFinite(Number(number)) ? Math.max(0, Number(number)) : 0;
  return {
    merchant: String(value?.merchant || "").slice(0, 120),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(value?.date || "")) ? value.date : "",
    currency: allowedCurrencies.has(value?.currency) ? value.currency : "JPY",
    subtotal: money(value?.subtotal), tax: money(value?.tax), discount: money(value?.discount), total: money(value?.total),
    paymentMethod: String(value?.paymentMethod || "").slice(0, 80),
    category: String(value?.category || "Recibo").slice(0, 80),
    confidence: Math.min(1, Math.max(0, Number(value?.confidence) || 0)),
    items: (Array.isArray(value?.items) ? value.items : []).slice(0, 80).map((item) => ({
      name: String(item?.name || "Item").slice(0, 160), quantity: money(item?.quantity) || 1,
      unitPrice: money(item?.unitPrice), total: money(item?.total), category: String(item?.category || "Outros").slice(0, 80)
    }))
  };
}
