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
- date: leia sempre na ordem japonesa ano/mes/dia. 年 marca o ano, 月 marca o mes e 日 marca o dia. Exemplo: 2026年09月22日 = 2026-09-22. Converta tambem datas de era japonesa quando forem legiveis.
- total: use SOMENTE o valor na mesma linha de 合計, 総合計, 税込合計, お会計 ou TOTAL. Exemplo: 合計 ¥427 significa total 427.
- お預り significa valor entregue pelo cliente e お釣り significa troco. Nunca use esses valores como total.
- Nunca use como total os valores de 小計 (subtotal), 内税/消費税 (imposto), saldo, pontos ou quantidade de itens.
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
  const direct = modelResponseValue(output);
  const text = typeof direct === "string" ? direct.trim() : "";
  let receipt = direct && typeof direct === "object" && !Array.isArray(direct) ? direct : parseModelJson(text);
  if (!receipt && text) receipt = parseReceiptText(text);
  if (!receipt && text) receipt = await repairModelJson(env, text);
  if (!receipt) return json({ error: "A IA leu o recibo, mas nao conseguiu organizar os dados. Tente novamente." }, 502);
  const sanitized = sanitizeReceipt(receipt);
  if (!sanitized.merchant && sanitized.total <= 0) return json({ error: "A leitura nao encontrou loja nem valor total. Confira o enquadramento e tente novamente." }, 422);
  return json({ receipt: sanitized });
}

function modelResponseValue(output) {
  const candidates = [output?.response, output?.description, output?.result?.response, output?.result];
  return candidates.find((value) => value && (typeof value === "string" || typeof value === "object")) || "";
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
    try {
      const relaxed = candidate
        .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":')
        .replace(/([{,]\s*)([A-Za-z_][\w-]*)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ':"$1"');
      const parsed = JSON.parse(relaxed);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

function parseReceiptText(text) {
  const source = normalizeJapaneseDigits(String(text || "").replace(/\*\*/g, "")).trim();
  if (!source) return null;
  const field = (names) => {
    const match = source.match(new RegExp(`(?:^|[\\n\\r])\\s*[-*]?\\s*(?:${names})\\s*[:：=-]\\s*([^\\n\\r]+)`, "i"));
    return match ? match[1].trim().replace(/[,;}]+$/, "").replace(/^["']|["']$/g, "").trim() : "";
  };
  const firstLine = source.split(/[\n\r]+/).map((line) => line.trim()).find((line) => line && line.length <= 120 && !/^[{\[]/.test(line)) || "";
  const merchant = field("merchant|merchant_name|store|loja|estabelecimento") || firstLine;
  const rawDate = field("date|data") || source;
  const rawCurrency = field("currency|moeda").toUpperCase();
  const japaneseTotal = source.match(/(?:^|[\n\r])\s*(?:総合計|税込合計|合\s*計(?:\/)?|お会計)\s*(?:[:：=-]\s*)?(?:\d+\s*(?:点|点数)\s*)?[¥￥]?\s*([0-9][0-9,.]*)/m);
  const rawTotal = field("grand_total|total|amount|valor(?: total)?") || japaneseTotal?.[1] || "";
  const paymentMethod = field("paymentMethod|payment_method|payment|pagamento|forma de pagamento")
    || (/paypay|merpay|楽天pay|d払い|qr/i.test(source) ? "qr_wallet"
      : /icoca|suica|pasmo|交通系|電子マネー/i.test(source) ? "electronic_money"
        : /クレジット|カード|credit/i.test(source) ? "card"
          : /現金|お預り|お釣り/.test(source) ? "cash" : "unknown");
  const category = field("category|categoria");
  const confidence = field("confidence|confianca|confiança");
  const total = parseMoney(rawTotal);
  if (!merchant && total <= 0) return null;
  return {
    merchant,
    date: normalizeDate(rawDate),
    currency: /BRL|R\$/.test(rawCurrency || rawTotal) ? "BRL" : /USD|US\$/.test(rawCurrency || rawTotal) ? "USD" : /EUR|€/.test(rawCurrency || rawTotal) ? "EUR" : "JPY",
    total,
    paymentMethod,
    category: category || "Outros",
    confidence: Number(String(confidence).replace(",", ".")) || 0.5
  };
}

function parseMoney(value) {
  const cleaned = normalizeJapaneseDigits(String(value || "")).replace(/[^0-9,.-]/g, "");
  if (!cleaned) return 0;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) normalized = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  else if (cleaned.includes(",")) normalized = /,\d{3}$/.test(cleaned) ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  else if (/\.\d{3}$/.test(cleaned)) normalized = cleaned.replace(/\./g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeDate(value) {
  const text = normalizeJapaneseDigits(String(value || "")).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/(\d{4})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const era = text.match(/(令和|平成|昭和)\s*(元|\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (!era) return "";
  const eraYear = era[2] === "元" ? 1 : Number(era[2]);
  const year = ({ "令和": 2018, "平成": 1988, "昭和": 1925 }[era[1]] || 0) + eraYear;
  return `${year}-${era[3].padStart(2, "0")}-${era[4].padStart(2, "0")}`;
}

function normalizeJapaneseDigits(value) {
  return String(value || "")
    .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xFF10))
    .replace(/，/g, ",")
    .replace(/．/g, ".")
    .replace(/￥/g, "¥");
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
    const value = modelResponseValue(repaired);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    return parseModelJson(value) || parseReceiptText(value);
  } catch {
    return null;
  }
}

function sanitizeReceipt(value) {
  const allowedCurrencies = new Set(["JPY", "BRL", "USD", "EUR"]);
  const money = (number) => Number.isFinite(Number(number)) ? Math.max(0, Number(number)) : 0;
  const source = value?.receipt && typeof value.receipt === "object" ? value.receipt : value?.data && typeof value.data === "object" ? value.data : value;
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
  const paymentMethod = paymentAliases[rawMethod]
    || (/paypay|merpay|qr/.test(rawMethod) ? "qr_wallet"
      : /icoca|suica|pasmo|electronic|e-money|電子/.test(rawMethod) ? "electronic_money"
        : /credit|card|cart[aã]o|カード|クレジット/.test(rawMethod) ? "card"
          : /cash|dinheiro|現金|お預り|お釣り/.test(rawMethod) ? "cash"
            : /transfer|ted|振込/.test(rawMethod) ? "bank_transfer" : "unknown");
  return {
    merchant: String(source?.merchant || source?.store || source?.merchant_name || "").slice(0, 120),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(source?.date || "")) ? source.date : "",
    currency: allowedCurrencies.has(currency) ? currency : "JPY",
    total: money(source?.total ?? source?.amount ?? source?.grand_total),
    paymentMethod,
    category: String(source?.category || "Outros").slice(0, 80),
    confidence: Math.min(1, Math.max(0, Number(source?.confidence) || 0)),
    items: []
  };
}
