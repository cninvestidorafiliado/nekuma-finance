const PAYPAL_BASE_URLS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function onRequestGet({ request, env }) {
  let diagnostics = {};
  try {
    const auth = await requireAuthorizedUser(request, env);
    if (auth.response) return auth.response;

    const clientId = String(env.PAYPAL_CLIENT_ID || "").trim();
    const clientSecret = String(env.PAYPAL_CLIENT_SECRET || "").trim();
    const paypalEnv = String(env.PAYPAL_ENV || "sandbox").trim().toLowerCase() === "live" ? "live" : "sandbox";
    const baseUrl = PAYPAL_BASE_URLS[paypalEnv];
    diagnostics = paypalDiagnostics(paypalEnv, clientId, clientSecret);

    if (!clientId || !clientSecret) {
      return jsonResponse({
        error: "Configure PAYPAL_CLIENT_ID e PAYPAL_CLIENT_SECRET no Cloudflare.",
        diagnostics
      }, 500);
    }

    const accessToken = await fetchPaypalAccessToken(baseUrl, clientId, clientSecret);
    const balances = await fetchPaypalBalances(baseUrl, accessToken);

    return jsonResponse({
      env: paypalEnv,
      source: "PayPal",
      updatedAt: new Date().toISOString(),
      asOfTime: balances.asOfTime || "",
      balances: balances.items
    });
  } catch (error) {
    return jsonResponse({
      error: error.message || "Nao foi possivel consultar o PayPal.",
      diagnostics
    }, error.status || 500);
  }
}

async function requireAuthorizedUser(request, env) {
  const requireAuth = String(env.PAYPAL_REQUIRE_AUTH || "true").toLowerCase() !== "false";
  if (!requireAuth) return { user: null };

  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      response: jsonResponse({ error: "Entre no app antes de consultar o PayPal." }, 401)
    };
  }

  const supabaseUrl = String(env.SUPABASE_URL || env.PONTE_SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.PONTE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      response: jsonResponse({
        error: "Configure SUPABASE_URL e SUPABASE_ANON_KEY no Cloudflare para proteger o PayPal."
      }, 500)
    };
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: supabaseAnonKey
    }
  });
  if (!userResponse.ok) {
    return {
      response: jsonResponse({ error: "Sessao Supabase invalida para consultar PayPal." }, 401)
    };
  }

  const user = await userResponse.json();
  const allowedEmails = String(env.PAYPAL_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (allowedEmails.length && !allowedEmails.includes(String(user.email || "").toLowerCase())) {
    return {
      response: jsonResponse({ error: "Seu usuario nao esta autorizado a consultar este PayPal." }, 403)
    };
  }

  return { user };
}

async function fetchPaypalAccessToken(baseUrl, clientId, clientSecret) {
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: "grant_type=client_credentials"
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const detail = payload.error_description || payload.error || "Falha ao autenticar no PayPal.";
    const error = new Error(detail);
    error.status = response.status || 502;
    throw error;
  }

  return payload.access_token;
}

async function fetchPaypalBalances(baseUrl, accessToken) {
  const response = await fetch(`${baseUrl}/v1/reporting/balances`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || payload.error_description || payload.error || "Falha ao consultar saldo PayPal.";
    const error = new Error(detail);
    error.status = response.status || 502;
    throw error;
  }

  return {
    asOfTime: payload.as_of_time || payload.asOfTime || "",
    items: normalizeBalances(payload.balances)
  };
}

function normalizeBalances(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const currency = item.currency || item.currency_code || item.total_balance?.currency_code || item.available_balance?.currency_code || "USD";
      const total = toNumber(item.total ?? item.total_balance?.value ?? item.total_balance?.amount);
      const available = toNumber(item.available ?? item.available_balance?.value ?? item.available_balance?.amount ?? total);
      const withheld = toNumber(item.withheld ?? item.withheld_balance?.value ?? item.withheld_balance?.amount);
      return {
        currency: String(currency).toUpperCase(),
        total,
        available,
        withheld,
        primary: Boolean(item.primary)
      };
    })
    .filter((item) => item.currency && Number.isFinite(item.total));
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function paypalDiagnostics(paypalEnv, clientId, clientSecret) {
  return {
    env: paypalEnv,
    clientId: maskCredential(clientId),
    hasClientSecret: Boolean(clientSecret),
    clientSecretLength: clientSecret ? String(clientSecret).length : 0
  };
}

function maskCredential(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= 10) return "***";
  return `${text.slice(0, 5)}...${text.slice(-5)}`;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type"
  };
}
