(function () {
  "use strict";

  const STORAGE_KEY = "ponte-financeira-state-v4";
  const REMOTE_HOUSEHOLD_KEY = "ponte-financeira-household-id";
  const LEGACY_STORAGE_KEYS = ["ponte-financeira-state-v1", "ponte-financeira-state-v2"];
  const outflowTypes = ["expense", "debt", "card", "consortium", "vehicle"];
  const allOutflowTypes = ["expense", "debt", "card", "consortium", "investment", "vehicle"];
  const countryMeta = {
    brasil: { label: "Brasil", short: "BR", currency: "BRL", color: "#42a67a" },
    japao: { label: "Japao", short: "JP", currency: "JPY", color: "#f5c84c" },
    global: { label: "Global", short: "GL", currency: "JPY", color: "#11110f" }
  };
  const typeMeta = {
    income: { label: "Entrada", icon: "+", tone: "green" },
    expense: { label: "Despesa", icon: "-", tone: "red" },
    debt: { label: "Financiamento", icon: "F", tone: "blue" },
    card: { label: "Cartao", icon: "N", tone: "red" },
    consortium: { label: "Consorcio", icon: "C", tone: "blue" },
    investment: { label: "Investimento", icon: "I", tone: "green" },
    vehicle: { label: "Veiculo", icon: "V", tone: "blue" }
  };
  const sourceColors = ["#42a67a", "#f5c84c", "#567c9b", "#d95d4e", "#8b6fd6", "#2db7a3", "#f08b4f"];
  const collectionPrefixes = {
    transactions: "tx",
    transfers: "tr",
    commitments: "co",
    debts: "de",
    investments: "iv",
    creditCards: "cc",
    cardPurchases: "cp",
    cryptoAssets: "cr",
    vehicleMaintenance: "vm",
    incomeSources: "is",
    workIncomes: "wi"
  };
  const incomeSourceTypeMeta = {
    salary: "Salario Empresa",
    amazon: "Amazon Flex",
    uber: "Uber Eats",
    extra: "Renda extra"
  };
  const cryptoCatalog = {
    BTC: { id: "bitcoin", name: "Bitcoin", color: "#f7931a" },
    ETH: { id: "ethereum", name: "Ethereum", color: "#627eea" },
    SOL: { id: "solana", name: "Solana", color: "#48d1cc" },
    ADA: { id: "cardano", name: "Cardano", color: "#d6e85d" },
    XRP: { id: "ripple", name: "XRP", color: "#9aa0a6" },
    USDT: { id: "tether", name: "Tether", color: "#26a17b" },
    BNB: { id: "binancecoin", name: "BNB", color: "#f3ba2f" },
    DOGE: { id: "dogecoin", name: "Dogecoin", color: "#c2a633" },
    DOT: { id: "polkadot", name: "Polkadot", color: "#e6007a" },
    AVAX: { id: "avalanche-2", name: "Avalanche", color: "#e84142" },
    LINK: { id: "chainlink", name: "Chainlink", color: "#2a5ada" },
    LTC: { id: "litecoin", name: "Litecoin", color: "#345d9d" }
  };

  const app = document.getElementById("app");
  const appGreeting = document.getElementById("app-greeting");
  const modalRoot = document.getElementById("modal-root");
  const toast = document.getElementById("toast");
  let toastTimer = null;
  let cryptoFetchInFlight = false;
  let cryptoRefreshTimer = null;
  let fxFetchInFlight = false;
  let fxRefreshTimer = null;
  cleanupLegacyStorage();
  let state = loadState();
  const remoteStore = createRemoteStore();
  const remoteSession = {
    status: remoteStore.enabled ? "loading" : "local",
    user: null,
    householdId: "",
    household: null,
    error: "",
    lastSyncedAt: null,
    saving: false
  };
  let remoteSaveTimer = null;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js?v=19")
        .then((registration) => registration.update().catch(() => {}))
        .catch(() => {});
    });
  }

  initApp();

  document.addEventListener("click", (event) => {
    if (event.target.classList && event.target.classList.contains("modal-backdrop")) {
      closeModal();
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    if (action === "set-country") {
      state.ui.activeCountry = button.dataset.country;
      saveState();
      render();
    }

    if (action === "set-tab") {
      state.ui.activeTab = button.dataset.tab;
      saveState();
      render();
    }

    if (action === "month-prev" || action === "month-next") {
      state.ui.selectedMonth = addMonths(state.ui.selectedMonth, action === "month-prev" ? -1 : 1);
      saveState();
      render();
    }

    if (action === "open-modal") openModal(button.dataset.modal, button.dataset.id);
    if (action === "close-modal") closeModal();
    if (action === "pay-commitment") payCommitment(button.dataset.id);
    if (action === "pay-card-bill") payCardBill(button.dataset.id);
    if (action === "delete-transaction") deleteItem("transactions", button.dataset.id, "Lancamento removido.");
    if (action === "delete-transfer") deleteItem("transfers", button.dataset.id, "Transferencia removida.");
    if (action === "delete-commitment") deleteItem("commitments", button.dataset.id, "Conta removida.");
    if (action === "delete-debt") deleteItem("debts", button.dataset.id, "Contrato removido.");
    if (action === "delete-investment") deleteItem("investments", button.dataset.id, "Investimento removido.");
    if (action === "delete-credit-card") deleteItem("creditCards", button.dataset.id, "Cartao removido.");
    if (action === "delete-card-purchase") deleteItem("cardPurchases", button.dataset.id, "Compra removida.");
    if (action === "delete-crypto") deleteItem("cryptoAssets", button.dataset.id, "Cripto removida.");
    if (action === "delete-vehicle-maintenance") deleteItem("vehicleMaintenance", button.dataset.id, "Manutencao removida.");
    if (action === "delete-income-source") deleteItem("incomeSources", button.dataset.id, "Empresa removida.");
    if (action === "delete-work-income") deleteItem("workIncomes", button.dataset.id, "Recebimento removido.");
    if (action === "refresh-crypto") refreshCryptoQuotes(true);
    if (action === "refresh-fx") refreshFxQuotes(true);
    if (action === "remote-signout") signOutRemote();
    if (action === "remote-sync-now") syncRemoteNow();
    if (action === "export-data") exportData();
    if (action === "reset-demo") resetDemo();
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form.matches("form[data-form]")) return;
    event.preventDefault();

    const formType = form.dataset.form;
    if (formType === "transaction") saveTransaction(form);
    if (formType === "transfer") saveTransfer(form);
    if (formType === "commitment") saveCommitment(form);
    if (formType === "debt") saveDebt(form);
    if (formType === "investment") saveInvestment(form);
    if (formType === "credit-card") saveCreditCard(form);
    if (formType === "card-purchase") saveCardPurchase(form);
    if (formType === "crypto") saveCryptoAsset(form);
    if (formType === "vehicle") saveVehicle(form);
    if (formType === "vehicle-maintenance") saveVehicleMaintenance(form);
    if (formType === "income-source") saveIncomeSource(form);
    if (formType === "work-income") saveWorkIncome(form);
    if (formType === "auth-login") signInRemote(form);
    if (formType === "auth-signup") signUpRemote(form);
    if (formType === "join-family") joinFamilyFromForm(form);
    if (formType === "settings") saveSettings(form);
  });

  document.addEventListener("input", (event) => {
    if (event.target.closest("[data-form='transfer']")) updateTransferPreview();
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "import-file") importData(event.target.files[0]);
  });

  window.addEventListener("resize", debounce(drawVisibleCharts, 120));

  function createRemoteStore() {
    const config = window.PONTE_SUPABASE_CONFIG || {};
    const url = String(config.url || "").trim();
    const anonKey = String(config.anonKey || "").trim();
    const enabled = Boolean(url && anonKey && window.supabase?.createClient);
    return {
      enabled,
      config: { ...config, url, anonKey },
      client: enabled ? window.supabase.createClient(url, anonKey) : null
    };
  }

  async function initApp() {
    if (!remoteStore.enabled) {
      render();
      return;
    }

    render();
    try {
      const { data, error } = await remoteStore.client.auth.getSession();
      if (error) throw error;
      const session = data?.session;
      if (!session?.user) {
        remoteSession.status = "signedOut";
        render();
        return;
      }

      remoteSession.user = session.user;
      await loadRemoteState();
      remoteSession.status = "ready";
      render();
    } catch (error) {
      remoteSession.status = "error";
      remoteSession.error = error.message || "Falha ao conectar Supabase.";
      render();
    }
  }

  async function signInRemote(form) {
    const data = formData(form);
    remoteSession.status = "loading";
    remoteSession.error = "";
    render();
    try {
      const { data: authData, error } = await remoteStore.client.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password
      });
      if (error) throw error;
      remoteSession.user = authData.user;
      const inviteCode = normalizeInviteCode(data.inviteCode);
      if (inviteCode) await joinRemoteHouseholdByCode(inviteCode);
      else await loadRemoteState(remoteSession.user?.user_metadata?.family_name);
      remoteSession.status = "ready";
      render();
      showToast(inviteCode ? "Familia conectada." : "Login realizado.");
    } catch (error) {
      remoteSession.status = "signedOut";
      remoteSession.error = error.message || "Nao foi possivel entrar.";
      render();
    }
  }

  async function signUpRemote(form) {
    const data = formData(form);
    remoteSession.status = "loading";
    remoteSession.error = "";
    render();
    try {
      const { data: authData, error } = await remoteStore.client.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: { family_name: data.familyName.trim() || state.settings.familyName }
        }
      });
      if (error) throw error;
      if (!authData.session?.user) {
        remoteSession.status = "signedOut";
        render();
        showToast("Conta criada. Confirme o email e depois entre com o codigo da familia.");
        return;
      }

      remoteSession.user = authData.user;
      state.settings.familyName = data.familyName.trim() || state.settings.familyName;
      const inviteCode = normalizeInviteCode(data.inviteCode);
      if (inviteCode) await joinRemoteHouseholdByCode(inviteCode);
      else await loadRemoteState(state.settings.familyName);
      remoteSession.status = "ready";
      render();
      showToast(inviteCode ? "Conta criada e familia conectada." : "Conta criada.");
    } catch (error) {
      remoteSession.status = "signedOut";
      remoteSession.error = error.message || "Nao foi possivel criar a conta.";
      render();
    }
  }

  async function signOutRemote() {
    if (!remoteStore.enabled) return;
    await flushRemoteState();
    await remoteStore.client.auth.signOut();
    remoteSession.status = "signedOut";
    remoteSession.user = null;
    remoteSession.householdId = "";
    remoteSession.household = null;
    remoteSession.error = "";
    render();
    showToast("Voce saiu da conta.");
  }

  async function joinFamilyFromForm(form) {
    const data = formData(form);
    const inviteCode = normalizeInviteCode(data.inviteCode);
    if (!inviteCode) {
      showToast("Informe o codigo da familia.");
      return;
    }

    remoteSession.saving = true;
    remoteSession.error = "";
    render();
    try {
      if (remoteSession.householdId) await flushRemoteState();
      await joinRemoteHouseholdByCode(inviteCode);
      remoteSession.saving = false;
      render();
      showToast("Familia conectada.");
    } catch (error) {
      remoteSession.saving = false;
      remoteSession.error = error.message || "Nao foi possivel conectar a familia.";
      render();
    }
  }

  async function joinRemoteHouseholdByCode(inviteCode) {
    const code = normalizeInviteCode(inviteCode);
    if (!code) throw new Error("Informe o codigo da familia.");
    const { data, error } = await remoteStore.client.rpc("join_household_by_code", {
      join_code: code
    });
    if (error) throw error;
    rememberRemoteHousehold(data);
    await loadRemoteStateForHousehold(data, false);
  }

  async function ensureRemoteHousehold(familyName) {
    const preferredName = familyName || remoteSession.user?.user_metadata?.family_name || state.settings.familyName || "Familia";
    const storedHouseholdId = rememberedRemoteHousehold();
    if (storedHouseholdId) {
      const storedHousehold = await fetchRemoteHousehold(storedHouseholdId);
      if (storedHousehold) {
        remoteSession.householdId = storedHousehold.id;
        remoteSession.household = storedHousehold;
        if (storedHousehold.name) state.settings.familyName = storedHousehold.name;
        return storedHousehold.id;
      }
      forgetRemoteHousehold();
    }

    const { data, error } = await remoteStore.client.rpc("ensure_default_household", {
      household_name: preferredName
    });
    if (error) throw error;
    remoteSession.householdId = data;
    rememberRemoteHousehold(data);
    const household = await fetchRemoteHousehold(data);
    remoteSession.household = household;
    if (household?.name === "Familia" && preferredName && preferredName !== "Familia") {
      await updateRemoteHouseholdName(preferredName);
    }
    if (remoteSession.household?.name) state.settings.familyName = remoteSession.household.name;
    return data;
  }

  async function loadRemoteState(familyName) {
    const householdId = await ensureRemoteHousehold(familyName);
    await loadRemoteStateForHousehold(householdId, true);
  }

  async function loadRemoteStateForHousehold(householdId, createIfEmpty) {
    const household = await fetchRemoteHousehold(householdId);
    if (!household) throw new Error("Familia nao encontrada para este usuario.");
    remoteSession.householdId = household.id;
    remoteSession.household = household;
    rememberRemoteHousehold(household.id);

    const { data, error } = await remoteStore.client
      .from("app_states")
      .select("state,updated_at")
      .eq("household_id", householdId)
      .maybeSingle();
    if (error) throw error;

    if (data?.state && Object.keys(data.state).length) {
      state = normalizeState(data.state);
    } else if (!createIfEmpty) {
      state = createInitialState();
    }
    state.settings.dataMode = "online";
    if (remoteSession.household?.name) state.settings.familyName = remoteSession.household.name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    remoteSession.lastSyncedAt = data?.updated_at || null;
    if ((!data?.state || !Object.keys(data.state).length) && createIfEmpty) await flushRemoteState();
  }

  async function fetchRemoteHousehold(householdId) {
    if (!householdId) return null;
    const household = await remoteStore.client
      .from("households")
      .select("id,name,invite_code")
      .eq("id", householdId)
      .maybeSingle();
    if (household.error) throw household.error;
    return household.data || null;
  }

  function remoteHouseholdStorageKey() {
    const userId = remoteSession.user?.id || "anonymous";
    return `${REMOTE_HOUSEHOLD_KEY}:${userId}`;
  }

  function rememberRemoteHousehold(householdId) {
    if (!householdId) return;
    localStorage.setItem(remoteHouseholdStorageKey(), householdId);
  }

  function rememberedRemoteHousehold() {
    return localStorage.getItem(remoteHouseholdStorageKey()) || "";
  }

  function forgetRemoteHousehold() {
    localStorage.removeItem(remoteHouseholdStorageKey());
  }

  function scheduleRemoteSave() {
    if (!remoteStore.enabled || remoteSession.status !== "ready" || !remoteSession.householdId) return;
    clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(() => {
      flushRemoteState().catch((error) => {
        remoteSession.error = error.message || "Falha ao sincronizar.";
        render();
      });
    }, 650);
  }

  async function flushRemoteState() {
    if (!remoteStore.enabled || !remoteSession.user || !remoteSession.householdId) return;
    clearTimeout(remoteSaveTimer);
    remoteSession.saving = true;
    const now = new Date().toISOString();
    const payload = {
      household_id: remoteSession.householdId,
      state: { ...state, settings: { ...state.settings, dataMode: "online" } },
      updated_by: remoteSession.user.id,
      updated_at: now
    };
    const { error } = await remoteStore.client
      .from("app_states")
      .upsert(payload, { onConflict: "household_id" });
    remoteSession.saving = false;
    if (error) throw error;
    remoteSession.lastSyncedAt = now;
  }

  async function syncRemoteNow() {
    try {
      await flushRemoteState();
      render();
      showToast("Sincronizado.");
    } catch (error) {
      remoteSession.error = error.message || "Falha ao sincronizar.";
      render();
    }
  }

  async function updateRemoteHouseholdName(name) {
    if (!remoteStore.enabled || !remoteSession.householdId) return;
    const { error } = await remoteStore.client
      .from("households")
      .update({ name })
      .eq("id", remoteSession.householdId);
    if (error) throw error;
    remoteSession.household = { ...(remoteSession.household || {}), name };
  }

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("ponte-financeira-state-v3");
      if (!stored) return createInitialState();
      return normalizeState(JSON.parse(stored));
    } catch (error) {
      return createInitialState();
    }
  }

  function cleanupLegacyStorage() {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  function normalizeState(raw) {
    const base = createInitialState();
    return {
      settings: { ...base.settings, ...(raw.settings || {}) },
      ui: { ...base.ui, ...(raw.ui || {}) },
      transactions: Array.isArray(raw.transactions) ? raw.transactions : base.transactions,
      transfers: Array.isArray(raw.transfers) ? raw.transfers : base.transfers,
      commitments: Array.isArray(raw.commitments) ? raw.commitments : base.commitments,
      debts: Array.isArray(raw.debts) ? raw.debts : base.debts,
      investments: Array.isArray(raw.investments) ? raw.investments : base.investments,
      creditCards: Array.isArray(raw.creditCards) ? raw.creditCards : base.creditCards,
      cardPurchases: Array.isArray(raw.cardPurchases) ? raw.cardPurchases : base.cardPurchases,
      cryptoAssets: Array.isArray(raw.cryptoAssets) ? raw.cryptoAssets : base.cryptoAssets,
      cryptoQuotes: raw.cryptoQuotes || base.cryptoQuotes,
      fxQuotes: raw.fxQuotes || base.fxQuotes,
      vehicle: { ...base.vehicle, ...(raw.vehicle || {}) },
      vehicleMaintenance: Array.isArray(raw.vehicleMaintenance) ? raw.vehicleMaintenance : base.vehicleMaintenance,
      incomeSources: Array.isArray(raw.incomeSources) ? raw.incomeSources : base.incomeSources,
      workIncomes: Array.isArray(raw.workIncomes) ? raw.workIncomes : base.workIncomes,
      paidCommitments: raw.paidCommitments || {}
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    scheduleRemoteSave();
  }

  function createInitialState() {
    const selectedMonth = currentMonth();

    return {
      settings: {
        familyName: "Familia",
        baseCurrency: "JPY",
        defaultRate: 0.0352,
        salaryDay: 25,
        dataMode: "local"
      },
      ui: {
        activeCountry: "global",
        activeTab: "dashboard",
        selectedMonth
      },
      transactions: [],
      transfers: [],
      commitments: [],
      debts: [],
      investments: [],
      creditCards: [],
      cardPurchases: [],
      cryptoAssets: [],
      cryptoQuotes: {
        prices: {},
        updatedAt: null,
        status: "idle"
      },
      fxQuotes: {
        usdBrl: 0,
        jpyBrl: 0,
        usdJpy: 0,
        btcUsd: 0,
        source: "",
        ratesDate: "",
        updatedAt: null,
        status: "idle"
      },
      vehicle: {
        model: "",
        plate: "",
        shakenAmount: 0,
        shakenDueDate: "",
        insuranceAmount: 0,
        insuranceDay: "",
        insuranceCompany: "",
        insurancePaymentMethod: "",
        currency: "JPY"
      },
      vehicleMaintenance: [],
      incomeSources: [],
      workIncomes: [],
      paidCommitments: {}
    };
  }

  function commitment(country, provider, title, category, type, amount, currency, dueDay) {
    return {
      id: uid("co"),
      country,
      provider,
      title,
      category,
      type,
      amount,
      currency,
      dueDay,
      active: true
    };
  }

  function debt(country, provider, title, type, originalAmount, outstandingAmount, installmentAmount, currency, dueDay) {
    return {
      id: uid("de"),
      country,
      provider,
      title,
      type,
      originalAmount,
      outstandingAmount,
      installmentAmount,
      currency,
      dueDay
    };
  }

  function investment(country, provider, title, currentAmount, monthlyContribution, currency, risk) {
    return {
      id: uid("iv"),
      country,
      provider,
      title,
      currentAmount,
      monthlyContribution,
      currency,
      risk
    };
  }

  function addSeedTx(list, month, day, country, type, title, category, amount, currency) {
    list.push({
      id: uid("tx"),
      date: dateInMonth(month, day),
      country,
      type,
      title,
      category,
      amount,
      currency,
      note: ""
    });
  }

  function render() {
    document.body.classList.toggle("auth-mode", remoteStore.enabled && remoteSession.status !== "ready");
    document.body.classList.toggle("online-mode", remoteStore.enabled && remoteSession.status === "ready");
    updateAppGreeting();
    if (remoteStore.enabled && remoteSession.status !== "ready") {
      app.innerHTML = renderAuthGate();
      return;
    }

    app.innerHTML = [
      renderToolbar(),
      renderFxCards(),
      renderCurrentTab()
    ].join("");

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.tab === state.ui.activeTab);
    });

    requestAnimationFrame(drawVisibleCharts);
    scheduleFxRefresh(false);
    scheduleCryptoRefresh(false);
  }

  function updateAppGreeting() {
    const family = remoteSession.household?.name || state.settings.familyName || "familia";
    if (appGreeting) {
      appGreeting.textContent = remoteStore.enabled && remoteSession.status !== "ready"
        ? "Ponte Financeira"
        : `Hey, ${family}`;
    }
  }

  function renderAuthGate() {
    const isLoading = remoteSession.status === "loading";
    const canSignup = remoteStore.config.enableSignup !== false;
    return `
      <section class="auth-panel">
        <article class="auth-visual" aria-hidden="true">
          <div class="auth-brand-mark">PF</div>
          <div>
            <p class="auth-kicker">Ponte Financeira</p>
            <h2>Um aplicativo financeiro completo. Dois paises em um so lugar.</h2>
          </div>
          <div class="auth-preview-card">
            <span>Total do mes</span>
            <strong>¥ 0</strong>
            <small>Online com Supabase</small>
          </div>
          <div class="auth-swatches">
            <span style="background:#312C51"></span>
            <span style="background:#48426D"></span>
            <span style="background:#F0C38E"></span>
            <span style="background:#F1AA9B"></span>
          </div>
        </article>

        <article class="auth-card">
          <div class="auth-card-head">
            <div>
              <p class="auth-kicker">Login</p>
              <h2>Entrar na conta</h2>
            </div>
            <span class="chip green">Online</span>
          </div>
          ${remoteSession.error ? `<p class="auth-error">${escapeHtml(remoteSession.error)}</p>` : ""}
          ${isLoading ? `<p class="empty-state">Conectando...</p>` : `
            <form class="form-grid" data-form="auth-login">
              <div class="field">
                <label for="loginEmail">Email</label>
                <input id="loginEmail" name="email" type="email" autocomplete="email" required />
              </div>
              <div class="field">
                <label for="loginPassword">Senha</label>
                <input id="loginPassword" name="password" type="password" autocomplete="current-password" required />
              </div>
              <div class="field">
                <label for="loginInviteCode">Codigo da familia</label>
                <input id="loginInviteCode" name="inviteCode" inputmode="text" autocomplete="off" placeholder="Opcional para entrar na familia existente" />
              </div>
              <button class="primary-button" type="submit">Entrar</button>
            </form>
          `}

          ${canSignup ? `
            <div class="auth-divider"><span>Criar acesso</span></div>
            <div class="auth-card-head compact">
              <div>
                <p class="auth-kicker">Cadastro</p>
                <h2>Nova familia</h2>
              </div>
            </div>
            <form class="form-grid" data-form="auth-signup">
              <div class="field">
                <label for="signupFamily">Nome da familia</label>
                <input id="signupFamily" name="familyName" value="${escapeAttr(state.settings.familyName)}" placeholder="Use se estiver criando uma nova familia" />
              </div>
              <div class="field">
                <label for="signupEmail">Email</label>
                <input id="signupEmail" name="email" type="email" autocomplete="email" required />
              </div>
              <div class="field">
                <label for="signupPassword">Senha</label>
                <input id="signupPassword" name="password" type="password" autocomplete="new-password" minlength="6" required />
              </div>
              <div class="field">
                <label for="signupInviteCode">Codigo da familia</label>
                <input id="signupInviteCode" name="inviteCode" inputmode="text" autocomplete="off" placeholder="Opcional para entrar na familia existente" />
              </div>
              <button class="secondary-button" type="submit">Criar login</button>
            </form>
          ` : ""}
        </article>
      </section>
    `;
  }

  function renderToolbar() {
    return `
      <section class="toolbar">
        <div class="segmented" role="tablist" aria-label="Pais">
          ${["global", "brasil", "japao"].map((country) => `
            <button type="button" data-action="set-country" data-country="${country}" class="${state.ui.activeCountry === country ? "is-active" : ""}">
              ${countryMeta[country].short} ${countryMeta[country].label}
            </button>
          `).join("")}
        </div>
        <div class="month-switcher" aria-label="Mes selecionado">
          <button class="month-button" type="button" data-action="month-prev" aria-label="Mes anterior">‹</button>
          <div class="month-current">${formatMonthLabel(state.ui.selectedMonth)}</div>
          <button class="month-button" type="button" data-action="month-next" aria-label="Proximo mes">›</button>
        </div>
      </section>
    `;
  }

  function renderFxCards() {
    const quotes = state.fxQuotes || {};
    const usdJpy = Number(quotes.usdJpy || (quotes.usdBrl && quotes.jpyBrl ? quotes.usdBrl / quotes.jpyBrl : 0));
    const btcUsd = Number(quotes.btcUsd || cryptoPrice("BTC", "USD") || 0);
    const status = fxStatusText();
    return `
      <section class="fx-strip" aria-label="Cotacoes">
        <article class="fx-card">
          <div>
            <p class="mini-label">Dolar / Real</p>
            <strong>${quotes.usdBrl ? formatFxRate(quotes.usdBrl, 4) : "--"}</strong>
          </div>
          <span class="chip green">USD</span>
        </article>
        <article class="fx-card">
          <div>
            <p class="mini-label">Dolar / Iene</p>
            <strong>${usdJpy ? formatYenRate(usdJpy) : "--"}</strong>
          </div>
          <span class="chip gold">JPY</span>
        </article>
        <article class="fx-card crypto-rate-card">
          <div>
            <p class="mini-label">BTC / Dolar</p>
            <strong>${btcUsd ? formatUsdRate(btcUsd) : "--"}</strong>
          </div>
          <span class="chip blue">BTC</span>
        </article>
        <article class="fx-card fx-status-card">
          <div>
            <p class="mini-label">Cotacao</p>
            <strong>${status.label}</strong>
            <p class="row-meta">${quotes.ratesDate ? `${escapeHtml(quotes.source || "Mercado")} · ${escapeHtml(quotes.ratesDate)}` : "Fonte mercado"}</p>
          </div>
          <button class="small-action ghost" type="button" data-action="refresh-fx">Atualizar</button>
        </article>
      </section>
    `;
  }

  function renderCurrentTab() {
    const tab = state.ui.activeTab;
    if (tab === "accounts") return renderAccounts();
    if (tab === "wise") return renderWise();
    if (tab === "reports") return renderReports();
    if (tab === "settings") return renderSettings();
    return renderDashboard();
  }

  function renderDashboard() {
    const summary = summarizeMonth(state.ui.selectedMonth, state.ui.activeCountry);
    const countryLabel = countryMeta[state.ui.activeCountry].label;
    const remainingClass = summary.remaining >= 0 ? "good" : "warn";

    return `
      <section class="dashboard-grid">
        <div class="hero-panel">
          <div class="hero-top">
            <div>
              <p class="hero-title">Saldo do mes - ${countryLabel}</p>
              <p class="hero-value">${formatMoney(summary.remaining, summary.currency)}</p>
              <p class="hero-subvalue">${summaryLine(summary)}</p>
            </div>
            <span class="status-pill">${state.settings.dataMode === "local" ? "Local" : "Online"}</span>
          </div>
          <div class="quick-actions">
            <button class="quick-action accent" type="button" data-action="open-modal" data-modal="transaction">
              <span aria-hidden="true">+</span> Lancamento
            </button>
            <button class="quick-action" type="button" data-action="open-modal" data-modal="transfer">
              <span aria-hidden="true">W</span> Transferir Wise
            </button>
            <button class="quick-action" type="button" data-action="open-modal" data-modal="workIncome">
              <span aria-hidden="true">¥</span> Recebimento
            </button>
          </div>
        </div>

        <div class="kpi-grid">
          <article class="metric-card good">
            <p class="metric-label">Entradas</p>
            <p class="metric-value">${formatMoney(summary.income + summary.bridgeIn, summary.currency)}</p>
            <p class="metric-foot">${summary.bridgeIn ? "Inclui Wise recebido" : "Receitas do mes"}</p>
          </article>
          <article class="metric-card warn">
            <p class="metric-label">Saidas</p>
            <p class="metric-value">${formatMoney(summary.expenses + summary.investments + summary.wiseOut + summary.fees, summary.currency)}</p>
            <p class="metric-foot">Contas, cartoes e reservas</p>
          </article>
          <article class="metric-card">
            <p class="metric-label">Wise</p>
            <p class="metric-value">${formatMoney(summary.wiseDisplay, summary.currency)}</p>
            <p class="metric-foot">${summary.wiseLabel}</p>
          </article>
          <article class="metric-card ${remainingClass}">
            <p class="metric-label">Folego</p>
            <p class="metric-value">${summary.coverage}%</p>
            <p class="metric-foot">Do plano mensal coberto</p>
          </article>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Calendario financeiro</h2>
          <span class="chip gold">${formatMonthLabel(state.ui.selectedMonth)}</span>
        </div>
        ${renderFinancialCalendar(8)}
      </section>

      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Meus Cartoes</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="creditCard">Novo</button>
          </div>
          ${renderCreditCardsPanel(3)}
        </article>

        <article class="content-panel crypto-panel">
          <div class="panel-head">
            <h2>Saldo cripto</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="crypto">Nova</button>
          </div>
          ${renderCryptoPanel()}
        </article>
      </section>

      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Empresas e Rendas</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="workIncome">Receber</button>
          </div>
          ${renderIncomePanel(3)}
        </article>

        <article class="content-panel vehicle-panel">
          <div class="panel-head">
            <h2>Veiculo Japao</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="vehicleMaintenance">Manutencao</button>
          </div>
          ${renderVehiclePanel(3)}
        </article>
      </section>

      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Comparativo</h2>
            <span class="chip gold">${latestRateLabel()}</span>
          </div>
          <div class="chart-wrap"><canvas id="trend-chart" aria-label="Grafico mensal"></canvas></div>
        </article>

        <article class="content-panel">
          <div class="panel-head">
            <h2>Proximas contas</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="commitment">Nova</button>
          </div>
          ${renderCommitmentList(6)}
        </article>
      </section>

      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Ultimos lancamentos</h2>
            <button class="small-action ghost" type="button" data-action="set-tab" data-tab="accounts">Ver contas</button>
          </div>
          ${renderTransactionList(monthLedgerEntries(state.ui.selectedMonth, state.ui.activeCountry).slice(0, 7))}
        </article>

        <article class="content-panel">
          <div class="panel-head">
            <h2>Ponte Brasil-Japao</h2>
            <button class="small-action dark" type="button" data-action="set-tab" data-tab="wise">Abrir</button>
          </div>
          ${renderBridgePanel()}
        </article>
      </section>
    `;
  }

  function renderAccounts() {
    return `
      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Empresas e Rendas</h2>
            <div class="chips">
              <button class="small-action ghost" type="button" data-action="open-modal" data-modal="incomeSource">Empresa</button>
              <button class="small-action" type="button" data-action="open-modal" data-modal="workIncome">Recebimento</button>
            </div>
          </div>
          ${renderIncomePanel(null)}
        </article>

        <article class="content-panel vehicle-panel">
          <div class="panel-head">
            <h2>Veiculo Japao</h2>
            <div class="chips">
              <button class="small-action ghost" type="button" data-action="open-modal" data-modal="vehicle">Editar</button>
              <button class="small-action" type="button" data-action="open-modal" data-modal="vehicleMaintenance">Manutencao</button>
            </div>
          </div>
          ${renderVehiclePanel(null)}
        </article>
      </section>

      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Meus Cartoes</h2>
            <div class="chips">
              <button class="small-action ghost" type="button" data-action="open-modal" data-modal="cardPurchase">Compra</button>
              <button class="small-action" type="button" data-action="open-modal" data-modal="creditCard">Novo cartao</button>
            </div>
          </div>
          ${renderCreditCardsPanel(null)}
        </article>

        <article class="content-panel crypto-panel">
          <div class="panel-head">
            <h2>Carteira cripto</h2>
            <div class="chips">
              <button class="small-action ghost" type="button" data-action="refresh-crypto">Atualizar</button>
              <button class="small-action" type="button" data-action="open-modal" data-modal="crypto">Nova cripto</button>
            </div>
          </div>
          ${renderCryptoPanel()}
        </article>
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Contas fixas</h2>
          <button class="small-action" type="button" data-action="open-modal" data-modal="commitment">Nova conta</button>
        </div>
        ${renderCommitmentList(null)}
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Compras no cartao</h2>
          <button class="small-action" type="button" data-action="open-modal" data-modal="cardPurchase">Nova compra</button>
        </div>
        ${renderCardPurchasesList(null)}
      </section>

      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Financiamentos e contratos</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="debt">Novo</button>
          </div>
          ${renderDebtList()}
        </article>
        <article class="content-panel">
          <div class="panel-head">
            <h2>Investimentos</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="investment">Novo</button>
          </div>
          ${renderInvestmentList()}
        </article>
      </section>
    `;
  }

  function renderWise() {
    const month = state.ui.selectedMonth;
    const transfers = monthTransfers(month);
    const totalSent = sum(transfers, "sentAmount");
    const totalFees = sum(transfers, "feeAmount");
    const totalReceived = sum(transfers, "receivedAmount");
    const effective = totalSent ? totalReceived / totalSent : latestRate(month);
    const brExpenses = summarizeMonth(month, "brasil").expenses + summarizeMonth(month, "brasil").investments;
    const gap = totalReceived - brExpenses;

    return `
      <section class="content-panel">
        <div class="panel-head">
          <h2>Transferencias Wise</h2>
          <button class="small-action" type="button" data-action="open-modal" data-modal="transfer">Nova Wise</button>
        </div>
        <div class="stat-strip">
          <div class="stat-box">
            <p class="mini-label">Enviado do Japao</p>
            <strong>${formatMoney(totalSent, "JPY")}</strong>
          </div>
          <div class="stat-box">
            <p class="mini-label">Recebido no Brasil</p>
            <strong>${formatMoney(totalReceived, "BRL")}</strong>
          </div>
          <div class="stat-box">
            <p class="mini-label">Taxas</p>
            <strong>${formatMoney(totalFees, "JPY")}</strong>
          </div>
          <div class="stat-box">
            <p class="mini-label">Cotacao efetiva</p>
            <strong>${formatRate(effective)}</strong>
          </div>
        </div>
      </section>

      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Cobertura Brasil</h2>
            <span class="chip ${gap >= 0 ? "green" : "red"}">${gap >= 0 ? "Sobra" : "Falta"}</span>
          </div>
          <div class="list">
            <div class="list-row compact">
              <div>
                <p class="row-title">Contas BR do mes</p>
                <p class="row-meta">Financiamentos, consorcio, cartao e reservas</p>
              </div>
              <div class="row-amount expense">${formatMoney(brExpenses, "BRL")}</div>
            </div>
            <div class="list-row compact">
              <div>
                <p class="row-title">Wise recebido</p>
                <p class="row-meta">Valor que entrou no Brasil</p>
              </div>
              <div class="row-amount income">${formatMoney(totalReceived, "BRL")}</div>
            </div>
            <div class="list-row compact">
              <div>
                <p class="row-title">Diferenca</p>
                <p class="row-meta">Ponte do mes atual</p>
              </div>
              <div class="row-amount ${gap >= 0 ? "income" : "expense"}">${formatMoney(gap, "BRL")}</div>
            </div>
          </div>
        </article>

        <article class="content-panel">
          <div class="panel-head">
            <h2>Historico Wise</h2>
            <span class="chip blue">${transfers.length} no mes</span>
          </div>
          ${renderTransferList(transfers)}
        </article>
      </section>
    `;
  }

  function renderReports() {
    const summary = summarizeMonth(state.ui.selectedMonth, state.ui.activeCountry);
    const country = state.ui.activeCountry;
    const scope = countryMeta[country].label;

    return `
      <section class="content-panel">
        <div class="panel-head">
          <h2>Relatorios - ${scope}</h2>
          <span class="chip gold">${formatMonthLabel(state.ui.selectedMonth)}</span>
        </div>
        <div class="stat-strip">
          <div class="stat-box">
            <p class="mini-label">Entradas</p>
            <strong>${formatMoney(summary.income + summary.bridgeIn, summary.currency)}</strong>
          </div>
          <div class="stat-box">
            <p class="mini-label">Saidas</p>
            <strong>${formatMoney(summary.expenses + summary.investments + summary.wiseOut + summary.fees, summary.currency)}</strong>
          </div>
          <div class="stat-box">
            <p class="mini-label">Investido</p>
            <strong>${formatMoney(summary.investments, summary.currency)}</strong>
          </div>
          <div class="stat-box">
            <p class="mini-label">Saldo final</p>
            <strong>${formatMoney(summary.remaining, summary.currency)}</strong>
          </div>
        </div>
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Agenda do mes</h2>
          <span class="chip gold">${formatMonthLabel(state.ui.selectedMonth)}</span>
        </div>
        ${renderFinancialCalendar(null)}
      </section>

      <section class="reports-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Mes a mes</h2>
            <span class="chip blue">6 meses</span>
          </div>
          <div class="chart-wrap"><canvas id="trend-chart" aria-label="Comparativo de meses"></canvas></div>
        </article>
        <article class="content-panel">
          <div class="panel-head">
            <h2>Categorias</h2>
            <span class="chip gold">${countryMeta[country].short}</span>
          </div>
          <div class="chart-wrap"><canvas id="category-chart" aria-label="Gastos por categoria"></canvas></div>
        </article>
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Brasil x Japao</h2>
          <span class="chip green">Convertido em JPY</span>
        </div>
        <div class="chart-wrap"><canvas id="country-chart" aria-label="Comparativo entre paises"></canvas></div>
      </section>

      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Rendas do mes</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="workIncome">Adicionar</button>
          </div>
          ${renderIncomeReport()}
        </article>

        <article class="content-panel">
          <div class="panel-head">
            <h2>Veiculo no mes</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="vehicleMaintenance">Adicionar</button>
          </div>
          ${renderVehicleReport()}
        </article>
      </section>
    `;
  }

  function renderSettings() {
    return `
      <section class="content-panel">
        <div class="panel-head">
          <h2>Ajustes</h2>
          <span class="chip ${state.settings.dataMode === "local" ? "gold" : "green"}">${state.settings.dataMode}</span>
        </div>
        <form class="form-grid" data-form="settings">
          <div class="two-cols">
            <div class="field">
              <label for="familyName">Nome da familia</label>
              <input id="familyName" name="familyName" value="${escapeAttr(state.settings.familyName)}" />
            </div>
            <div class="field">
              <label for="salaryDay">Dia do salario</label>
              <input id="salaryDay" name="salaryDay" type="number" min="1" max="31" value="${state.settings.salaryDay}" />
            </div>
          </div>
          <div class="two-cols">
            <div class="field">
              <label for="defaultRate">Cotacao padrao BRL por JPY</label>
              <input id="defaultRate" name="defaultRate" type="number" min="0" step="0.0001" value="${state.settings.defaultRate}" />
            </div>
            <div class="field">
              <label for="baseCurrency">Moeda global</label>
              <select id="baseCurrency" name="baseCurrency">
                <option value="JPY" ${state.settings.baseCurrency === "JPY" ? "selected" : ""}>JPY</option>
                <option value="BRL" ${state.settings.baseCurrency === "BRL" ? "selected" : ""}>BRL</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="primary-button" type="submit">Salvar ajustes</button>
          </div>
        </form>
      </section>

      ${renderCloudSettings()}

      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Backup</h2>
            <span class="chip blue">JSON</span>
          </div>
          <div class="form-grid">
            <button class="secondary-button" type="button" data-action="export-data">Exportar dados</button>
            <div class="field">
              <label for="import-file">Importar backup</label>
              <input id="import-file" type="file" accept="application/json" />
            </div>
          </div>
        </article>

        <article class="content-panel">
          <div class="panel-head">
            <h2>Ambiente</h2>
            <span class="chip gold">PWA</span>
          </div>
          <div class="list">
            <div class="list-row compact">
              <div>
                <p class="row-title">Armazenamento</p>
                <p class="row-meta">${remoteStore.enabled ? "Supabase com cache local" : "Navegador deste dispositivo"}</p>
              </div>
              <span class="chip ${remoteStore.enabled ? "green" : "gold"}">${remoteStore.enabled ? "Online" : "Local"}</span>
            </div>
            <div class="list-row compact">
              <div>
                <p class="row-title">Sincronizacao</p>
                <p class="row-meta">${remoteStore.enabled ? "Ativa para usuarios conectados" : "Pronto para conectar Supabase"}</p>
              </div>
              <span class="chip blue">${remoteStore.enabled ? "Supabase" : "Proxima etapa"}</span>
            </div>
            <button class="danger-button" type="button" data-action="reset-demo">Resetar dados</button>
          </div>
        </article>
      </section>
    `;
  }

  function renderCloudSettings() {
    if (!remoteStore.enabled) return "";
    const userEmail = remoteSession.user?.email || "desconectado";
    const household = remoteSession.household || {};
    return `
      <section class="content-panel">
        <div class="panel-head">
          <h2>Nuvem</h2>
          <span class="chip green">${remoteSession.saving ? "Salvando" : "Online"}</span>
        </div>
        <div class="list">
          <div class="list-row compact">
            <div>
              <p class="row-title">${escapeHtml(userEmail)}</p>
              <p class="row-meta">Conta conectada no Supabase</p>
            </div>
            <button class="small-action ghost" type="button" data-action="remote-signout">Sair</button>
          </div>
          <div class="list-row compact">
            <div>
              <p class="row-title">${escapeHtml(household.name || state.settings.familyName)}</p>
              <p class="row-meta">Compartilhe este codigo: ${escapeHtml(household.invite_code || "--")}</p>
            </div>
            <button class="small-action" type="button" data-action="remote-sync-now">Sincronizar</button>
          </div>
          <form class="join-family-card" data-form="join-family">
            <div class="field">
              <label for="joinInviteCode">Entrar em outra familia</label>
              <input id="joinInviteCode" name="inviteCode" inputmode="text" autocomplete="off" required placeholder="Cole aqui o codigo da familia" />
            </div>
            <button class="secondary-button" type="submit">Conectar familia</button>
          </form>
          <div class="list-row compact">
            <div>
              <p class="row-title">Ultima sincronizacao</p>
              <p class="row-meta">${remoteSession.lastSyncedAt ? formatDateTime(remoteSession.lastSyncedAt) : "Ainda nao sincronizado"}</p>
            </div>
            <span class="chip blue">Cloud</span>
          </div>
          ${remoteSession.error ? `<p class="auth-error">${escapeHtml(remoteSession.error)}</p>` : ""}
        </div>
      </section>
    `;
  }

  function renderCommitmentList(limit) {
    const month = state.ui.selectedMonth;
    const commitments = state.commitments
      .filter((item) => item.active !== false)
      .filter((item) => inCountryScope(item.country))
      .filter((item) => isCommitmentDueInMonth(item, month))
      .sort((a, b) => a.dueDay - b.dueDay);
    const rows = (limit ? commitments.slice(0, limit) : commitments).map((item) => {
      const paid = isCommitmentPaid(item.id, month);
      const meta = typeMeta[item.type] || typeMeta.expense;
      const dueDate = dateInMonth(month, item.dueDay);
      const dueState = dueStateForDate(dueDate, paid);
      const frequency = commitmentFrequencyLabel(item);
      return `
        <div class="list-row">
          <span class="row-icon ${paid ? "green" : dueState.tone || meta.tone}">${paid ? "OK" : meta.icon}</span>
          <div class="row-main">
            <p class="row-title">${escapeHtml(item.title)}</p>
            <p class="row-meta">${countryMeta[item.country].label} - dia ${item.dueDay} - ${frequency} - ${escapeHtml(item.provider || item.category)}</p>
            <p class="row-meta">${dueState.label}${item.alertDays ? ` - alerta ${item.alertDays} dias antes` : ""}</p>
          </div>
            <div class="row-amount">
              ${formatMoney(item.amount, item.currency)}
              <div class="chips" style="justify-content:flex-end;margin-top:6px">
                <button class="small-action ${paid ? "ghost" : ""}" type="button" data-action="pay-commitment" data-id="${item.id}">${paid ? "Pago" : "Pagar"}</button>
                ${limit ? "" : `<button class="small-action ghost" type="button" data-action="open-modal" data-modal="commitment" data-id="${item.id}">Editar</button>`}
                ${limit ? "" : `<button class="small-action ghost" type="button" data-action="delete-commitment" data-id="${item.id}">Excluir</button>`}
              </div>
            </div>
        </div>
      `;
    }).join("");

    return rows ? `<div class="list">${rows}</div>` : `<p class="empty-state">Nenhuma conta neste modo.</p>`;
  }

  function renderDebtList() {
    const debts = state.debts.filter((item) => inCountryScope(item.country));
    if (!debts.length) return `<p class="empty-state">Nenhum financiamento cadastrado.</p>`;
    return `
      <div class="list">
        ${debts.map((item) => {
          const paid = Math.max(0, item.originalAmount - item.outstandingAmount);
          const progress = clamp(Math.round((paid / item.originalAmount) * 100), 0, 100);
          return `
            <div class="list-row compact">
              <div>
                <p class="row-title">${escapeHtml(item.title)}</p>
                <p class="row-meta">${countryMeta[item.country].label} · ${escapeHtml(item.provider)} · parcela ${formatMoney(item.installmentAmount, item.currency)}</p>
                <div class="progress-track" aria-hidden="true"><div class="progress-fill" style="width:${progress}%"></div></div>
                <p class="row-meta">${progress}% quitado · saldo ${formatMoney(item.outstandingAmount, item.currency)}</p>
              </div>
              <div class="row-actions">
                <button class="small-action ghost" type="button" data-action="open-modal" data-modal="debt" data-id="${item.id}">Editar</button>
                <button class="small-action ghost" type="button" data-action="delete-debt" data-id="${item.id}">Excluir</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderInvestmentList() {
    const investments = state.investments.filter((item) => inCountryScope(item.country));
    if (!investments.length) return `<p class="empty-state">Nenhum investimento cadastrado.</p>`;
    return `
      <div class="list">
        ${investments.map((item) => `
          <div class="list-row">
            <span class="row-icon green">I</span>
            <div class="row-main">
              <p class="row-title">${escapeHtml(item.title)}</p>
              <p class="row-meta">${countryMeta[item.country].label} · ${escapeHtml(item.provider)} · risco ${escapeHtml(item.risk)}</p>
            </div>
            <div class="row-amount">
              ${formatMoney(item.currentAmount, item.currency)}
              <p class="row-meta">+ ${formatMoney(item.monthlyContribution, item.currency)}/mes</p>
              <div class="row-actions">
                <button class="small-action ghost" type="button" data-action="open-modal" data-modal="investment" data-id="${item.id}">Editar</button>
                <button class="small-action ghost" type="button" data-action="delete-investment" data-id="${item.id}">Excluir</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderCreditCardsPanel(limit) {
    const cards = state.creditCards || [];
    if (!cards.length) return `<p class="empty-state">Nenhum cartao cadastrado.</p>`;
    const visible = limit ? cards.slice(0, limit) : cards;
    return `
      <div class="cards-wallet">
        ${visible.map((item) => {
          const country = countryMeta[item.country] || countryMeta.japao;
          const bill = creditCardMonthBill(item, state.ui.selectedMonth);
          const paid = isCardBillPaid(item.id, state.ui.selectedMonth);
          const usage = item.limitAmount ? clamp(Math.round((bill.total / item.limitAmount) * 100), 0, 999) : 0;
          return `
            <div class="credit-card-tile ${item.country === "brasil" ? "br-card" : "jp-card"}">
              <div class="flag-badge ${item.country === "brasil" ? "br" : "jp"}">${country.short}</div>
              <div class="card-brand">${escapeHtml(item.brand || "Credito")}</div>
              <p class="card-name">${escapeHtml(item.nickname || item.issuer)}</p>
              <p class="card-number">**** ${escapeHtml(item.last4 || "0000")}</p>
              <div class="card-foot">
                <span>Fatura ${formatMoney(bill.total, item.currency)}</span>
                <span>${usage}%</span>
              </div>
              <div class="progress-track card-progress" aria-hidden="true"><div class="progress-fill" style="width:${clamp(usage, 0, 100)}%"></div></div>
              <div class="card-meta-row">
                <span>Fecha ${item.closingDay || "--"}</span>
                <span>Vence ${item.dueDay || "--"}</span>
              </div>
              <div class="card-meta-row">
                <span>${bill.purchaseCount} compra${bill.purchaseCount === 1 ? "" : "s"}</span>
                <span>${paid ? "Pago" : "Aberto"}</span>
              </div>
              ${limit ? "" : `
                <div class="card-actions">
                  <button class="small-action ghost" type="button" data-action="open-modal" data-modal="creditCard" data-id="${item.id}">Editar</button>
                  <button class="small-action" type="button" data-action="pay-card-bill" data-id="${item.id}">${paid ? "Pago" : "Pagar fatura"}</button>
                  <button class="small-action ghost" type="button" data-action="delete-credit-card" data-id="${item.id}">Excluir</button>
                </div>
              `}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderCardPurchasesList(limit) {
    const rows = cardPurchaseRows(state.ui.selectedMonth, state.ui.activeCountry);
    if (!rows.length) return `<p class="empty-state">Nenhuma compra de cartao neste mes.</p>`;
    const visible = limit ? rows.slice(0, limit) : rows;
    return `
      <div class="list">
        ${visible.map((row) => `
          <div class="list-row">
            <span class="row-icon blue">${row.installment}/${row.installments}</span>
            <div class="row-main">
              <p class="row-title">${escapeHtml(row.title)}</p>
              <p class="row-meta">${escapeHtml(row.cardName)} - ${escapeHtml(row.category || "Cartao")} - compra ${formatShortDate(row.purchaseDate)}</p>
            </div>
            <div class="row-amount expense">
              ${formatMoney(row.amount, row.currency)}
              ${limit ? "" : `
                <div class="row-actions">
                  <button class="small-action ghost" type="button" data-action="open-modal" data-modal="cardPurchase" data-id="${row.id}">Editar</button>
                  <button class="small-action ghost" type="button" data-action="delete-card-purchase" data-id="${row.id}">Excluir</button>
                </div>
              `}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderFinancialCalendar(limit) {
    const items = financialCalendarItems(state.ui.selectedMonth, state.ui.activeCountry);
    if (!items.length) return `<p class="empty-state">Nenhum evento financeiro neste mes.</p>`;
    const visible = limit ? items.slice(0, limit) : items;
    return `
      <div class="calendar-list">
        ${visible.map((item) => `
          <div class="calendar-item ${item.tone}">
            <div class="calendar-date">
              <span>${formatCalendarDay(item.date)}</span>
              <small>${formatCalendarWeekday(item.date)}</small>
            </div>
            <div class="calendar-main">
              <p class="row-title">${escapeHtml(item.title)}</p>
              <p class="row-meta">${escapeHtml(item.meta)}</p>
            </div>
            <div class="calendar-amount ${item.kind === "income" ? "income" : "expense"}">
              ${item.kind === "income" ? "+" : "-"} ${formatMoney(item.amount, item.currency)}
              <span class="chip ${item.tone}">${escapeHtml(item.status)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderCryptoPanel() {
    const assets = state.cryptoAssets || [];
    const summary = cryptoSummary();
    const status = cryptoStatusText();
    if (!assets.length) {
      return `
        <div class="crypto-empty">
          <div class="crypto-donut-placeholder">0</div>
          <p class="empty-state">Nenhuma cripto cadastrada.</p>
        </div>
      `;
    }

    return `
      <div class="crypto-layout">
        <div class="crypto-donut-wrap">
          <canvas id="crypto-donut-chart" aria-label="Distribuicao da carteira cripto"></canvas>
          <div class="crypto-center">
            <span>Total</span>
            <strong>${formatMoney(summary.totalValue, summary.currency)}</strong>
            <small class="${summary.pnl >= 0 ? "income" : "expense"}">${formatSignedMoney(summary.pnl, summary.currency)}</small>
          </div>
        </div>
        <div class="crypto-side">
          <div class="stat-strip crypto-stats">
            <div class="stat-box">
              <p class="mini-label">Investido</p>
              <strong>${formatMoney(summary.totalCost, summary.currency)}</strong>
            </div>
            <div class="stat-box">
              <p class="mini-label">Resultado</p>
              <strong class="${summary.pnl >= 0 ? "income" : "expense"}">${summary.pnlPct}%</strong>
            </div>
          </div>
          <div class="chips crypto-status">
            <span class="chip ${status.tone}">${status.label}</span>
            <button class="small-action ghost" type="button" data-action="refresh-crypto">Atualizar</button>
          </div>
          ${renderCryptoAssetsList()}
        </div>
      </div>
    `;
  }

  function renderCryptoAssetsList() {
    const rows = cryptoAssetRows();
    if (!rows.length) return `<p class="empty-state">Nenhuma cripto cadastrada.</p>`;
    return `
      <div class="list crypto-list">
        ${rows.map((item) => `
          <div class="list-row crypto-row">
            <span class="row-icon" style="background:${item.color}">${escapeHtml(item.symbol.slice(0, 1))}</span>
            <div class="row-main">
              <p class="row-title">${escapeHtml(item.name)}</p>
              <p class="row-meta">${formatCryptoAmount(item.quantity)} ${escapeHtml(item.symbol)} - preco ${formatMoney(item.price, item.currency)}</p>
            </div>
            <div class="row-amount ${item.pnl >= 0 ? "income" : "expense"}">
              ${formatMoney(item.value, item.currency)}
              <p class="row-meta">${formatSignedMoney(item.pnl, item.currency)}</p>
              <div class="row-actions">
                <button class="small-action ghost" type="button" data-action="open-modal" data-modal="crypto" data-id="${item.id}">Editar</button>
                <button class="small-action ghost" type="button" data-action="delete-crypto" data-id="${item.id}">Excluir</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderIncomePanel(limit) {
    const sources = state.incomeSources || [];
    const monthRows = monthWorkIncomes(state.ui.selectedMonth);
    const visibleSources = limit ? sources.slice(0, limit) : sources;
    const rate = latestRate(state.ui.selectedMonth);
    const total = monthRows.reduce((current, item) => current + convert(item.amount, item.currency || "JPY", "JPY", rate), 0);

    if (!sources.length) {
      return `
        <div class="empty-action">
          <p class="empty-state">Nenhuma empresa cadastrada.</p>
          <button class="small-action" type="button" data-action="open-modal" data-modal="incomeSource">Adicionar empresa</button>
        </div>
      `;
    }

    return `
      <div class="stat-strip">
        <div class="stat-box">
          <p class="mini-label">Recebido no mes</p>
          <strong>${formatMoney(total, "JPY")}</strong>
        </div>
        <div class="stat-box">
          <p class="mini-label">Fontes</p>
          <strong>${sources.length}</strong>
        </div>
      </div>
      <div class="list source-list">
        ${visibleSources.map((source) => {
          const rows = monthRows.filter((row) => row.sourceId === source.id);
          const amount = sum(rows, "amount");
          return `
            <div class="list-row compact source-row">
              <div>
                <p class="row-title"><span class="source-dot" style="background:${escapeAttr(source.color)}"></span>${escapeHtml(source.name)}</p>
                <p class="row-meta">${incomeSourceTypeMeta[source.type] || "Renda"} - ${source.hourlyRate ? `${formatMoney(source.hourlyRate, source.currency || "JPY")}/h` : "sem valor hora"}</p>
              </div>
              <div class="row-amount income">
                ${formatMoney(amount, source.currency || "JPY")}
                ${limit ? "" : `
                  <div class="row-actions">
                    <button class="small-action ghost" type="button" data-action="open-modal" data-modal="incomeSource" data-id="${source.id}">Editar</button>
                    <button class="small-action ghost" type="button" data-action="delete-income-source" data-id="${source.id}">Excluir</button>
                  </div>
                `}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderIncomeReport() {
    const rows = monthWorkIncomes(state.ui.selectedMonth);
    if (!rows.length) return `<p class="empty-state">Nenhum recebimento neste mes.</p>`;
    return `
      <div class="list">
        ${rows.map((item) => {
          const source = incomeSourceById(item.sourceId);
          return `
            <div class="list-row">
              <span class="row-icon" style="background:${escapeAttr(source.color)}">¥</span>
              <div class="row-main">
                <p class="row-title">${escapeHtml(source.name)}</p>
                <p class="row-meta">${formatShortDate(item.date)} - ${incomeSourceTypeMeta[source.type] || "Renda"} - ${workIncomeMeta(item)}</p>
              </div>
              <div class="row-amount income">
                + ${formatMoney(item.amount, item.currency)}
                <div class="row-actions">
                  <button class="small-action ghost" type="button" data-action="open-modal" data-modal="workIncome" data-id="${item.id}">Editar</button>
                  <button class="small-action ghost" type="button" data-action="delete-work-income" data-id="${item.id}">Excluir</button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderVehiclePanel(limit) {
    const vehicle = state.vehicle || {};
    const costs = vehicleMonthlyCosts(state.ui.selectedMonth);
    const maintenance = (state.vehicleMaintenance || [])
      .filter((item) => item.date && item.date.slice(0, 7) === state.ui.selectedMonth)
      .sort((a, b) => b.date.localeCompare(a.date));
    const visible = limit ? maintenance.slice(0, limit) : maintenance;

    if (!vehicle.model && !vehicle.plate) {
      return `
        <div class="empty-action">
          <p class="empty-state">Nenhum veiculo cadastrado.</p>
          <button class="small-action" type="button" data-action="open-modal" data-modal="vehicle">Cadastrar veiculo</button>
        </div>
      `;
    }

    return `
      <div class="vehicle-card">
        <div>
          <p class="mini-label">Modelo</p>
          <strong>${escapeHtml(vehicle.model || "Veiculo")}</strong>
          <p class="row-meta">${escapeHtml(vehicle.plate || "sem placa")}</p>
        </div>
        <span class="chip blue">JP</span>
      </div>
      <div class="stat-strip">
        <div class="stat-box">
          <p class="mini-label">Custo no mes</p>
          <strong>${formatMoney(sum(costs, "amount"), "JPY")}</strong>
        </div>
        <div class="stat-box">
          <p class="mini-label">Shaken</p>
          <strong>${vehicle.shakenDueDate ? formatShortDate(vehicle.shakenDueDate) : "--"}</strong>
        </div>
      </div>
      ${visible.length ? `
        <div class="list">
          ${visible.map((item) => `
            <div class="list-row compact">
              <div>
                <p class="row-title">${escapeHtml(item.kind)}</p>
                <p class="row-meta">${formatShortDate(item.date)} - ${escapeHtml(item.location || "local nao informado")} - ${escapeHtml(item.paymentMethod || "pagamento")}</p>
              </div>
              <div class="row-amount expense">
                ${formatMoney(item.amount, item.currency || "JPY")}
                ${limit ? "" : `
                  <div class="row-actions">
                    <button class="small-action ghost" type="button" data-action="open-modal" data-modal="vehicleMaintenance" data-id="${item.id}">Editar</button>
                    <button class="small-action ghost" type="button" data-action="delete-vehicle-maintenance" data-id="${item.id}">Excluir</button>
                  </div>
                `}
              </div>
            </div>
          `).join("")}
        </div>
      ` : `<p class="empty-state">Nenhuma manutencao neste mes.</p>`}
    `;
  }

  function renderVehicleReport() {
    const costs = vehicleMonthlyCosts(state.ui.selectedMonth);
    if (!costs.length) return `<p class="empty-state">Nenhum custo de veiculo neste mes.</p>`;
    return `
      <div class="list">
        ${costs.map((item) => `
          <div class="list-row">
            <span class="row-icon blue">V</span>
            <div class="row-main">
              <p class="row-title">${escapeHtml(item.title)}</p>
              <p class="row-meta">${formatShortDate(item.date)} - ${escapeHtml(item.note || item.category)}</p>
            </div>
            <div class="row-amount expense">${formatMoney(item.amount, item.currency)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderTransactionList(items) {
    if (!items.length) return `<p class="empty-state">Nenhum lancamento neste mes.</p>`;
    return `
      <div class="list">
        ${items.map((item) => {
          const meta = typeMeta[item.type] || typeMeta.expense;
          const isIncome = item.type === "income";
          const deleteAction = item.deleteAction || (item.generated ? "" : "delete-transaction");
          const editModal = item.editModal || (item.generated ? "" : "transaction");
          const iconStyle = item.color ? `style="background:${escapeAttr(item.color)}"` : "";
          return `
            <div class="list-row">
              <span class="row-icon ${meta.tone}" ${iconStyle}>${item.icon || meta.icon}</span>
              <div class="row-main">
                <p class="row-title">${escapeHtml(item.title)}</p>
                <p class="row-meta">${formatShortDate(item.date)} · ${countryMeta[item.country].label} · ${escapeHtml(item.category)}</p>
              </div>
              <div class="row-amount ${isIncome ? "income" : "expense"}">
                ${isIncome ? "+" : "-"} ${formatMoney(item.amount, item.currency)}
                ${editModal || deleteAction ? `
                  <div class="row-actions">
                    ${editModal ? `<button class="small-action ghost" type="button" data-action="open-modal" data-modal="${editModal}" data-id="${item.id}">Editar</button>` : ""}
                    ${deleteAction ? `<button class="small-action ghost" type="button" data-action="${deleteAction}" data-id="${item.id}">Excluir</button>` : ""}
                  </div>
                ` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderTransferList(items) {
    if (!items.length) return `<p class="empty-state">Nenhuma transferencia neste mes.</p>`;
    return `
      <div class="list">
        ${items.map((item) => `
          <div class="list-row">
            <span class="row-icon blue">W</span>
            <div class="row-main">
              <p class="row-title">${escapeHtml(item.method || "Wise")}</p>
              <p class="row-meta">${formatShortDate(item.date)} · cotacao ${formatRate(item.rate)} · taxa ${formatMoney(item.feeAmount, item.feeCurrency)}</p>
            </div>
            <div class="row-amount">
              ${formatMoney(item.sentAmount, item.sentCurrency)}
              <p class="row-meta">${formatMoney(item.receivedAmount, item.receivedCurrency)}</p>
              <div class="row-actions">
                <button class="small-action ghost" type="button" data-action="open-modal" data-modal="transfer" data-id="${item.id}">Editar</button>
                <button class="small-action ghost" type="button" data-action="delete-transfer" data-id="${item.id}">Excluir</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderBridgePanel() {
    const month = state.ui.selectedMonth;
    const transfers = monthTransfers(month);
    const brSummary = summarizeMonth(month, "brasil");
    const jpSummary = summarizeMonth(month, "japao");
    const received = sum(transfers, "receivedAmount");
    const brNeed = brSummary.expenses + brSummary.investments;
    const jpyNeeded = brNeed / latestRate(month);
    const coverage = brNeed ? clamp(Math.round((received / brNeed) * 100), 0, 999) : 100;

    return `
      <div class="list">
        <div class="list-row compact">
          <div>
            <p class="row-title">Brasil precisa</p>
            <p class="row-meta">Equivale a ${formatMoney(jpyNeeded, "JPY")} pela cotacao atual</p>
          </div>
          <div class="row-amount expense">${formatMoney(brNeed, "BRL")}</div>
        </div>
        <div class="list-row compact">
          <div>
            <p class="row-title">Wise cobriu</p>
            <p class="row-meta">${coverage}% do plano do Brasil</p>
          </div>
          <div class="row-amount income">${formatMoney(received, "BRL")}</div>
        </div>
        <div class="list-row compact">
          <div>
            <p class="row-title">Japao apos ponte</p>
            <p class="row-meta">Salario menos contas locais e Wise</p>
          </div>
          <div class="row-amount ${jpSummary.remaining >= 0 ? "income" : "expense"}">${formatMoney(jpSummary.remaining, "JPY")}</div>
        </div>
      </div>
    `;
  }

  function openModal(type, id = "") {
    const map = {
      transaction: renderTransactionModal,
      transfer: renderTransferModal,
      commitment: renderCommitmentModal,
      debt: renderDebtModal,
      investment: renderInvestmentModal,
      creditCard: renderCreditCardModal,
      cardPurchase: renderCardPurchaseModal,
      crypto: renderCryptoModal,
      vehicle: renderVehicleModal,
      vehicleMaintenance: renderVehicleMaintenanceModal,
      incomeSource: renderIncomeSourceModal,
      workIncome: renderWorkIncomeModal
    };
    const content = map[type] ? map[type](editableItem(type, id)) : "";
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Formulario">
          ${content}
        </div>
      </div>
    `;
    const first = modalRoot.querySelector("input, select, textarea, button");
    if (first) first.focus();
    updateTransferPreview();
  }

  function closeModal() {
    modalRoot.innerHTML = "";
  }

  function renderTransactionModal(item = null) {
    const activeCountry = item?.country || (state.ui.activeCountry === "global" ? "japao" : state.ui.activeCountry);
    const currency = countryMeta[activeCountry].currency;
    const selectedCurrency = item?.currency || currency;
    const date = item?.date || dateInMonth(state.ui.selectedMonth, new Date().getDate());
    return `
      <div class="modal-head">
        <h2>${item ? "Editar lancamento" : "Novo lancamento"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="transaction">
        ${editHidden(item)}
        <div class="two-cols">
          ${countrySelect(activeCountry)}
          <div class="field">
            <label for="type">Tipo</label>
            <select id="type" name="type">
              ${Object.entries(typeMeta).map(([key, meta]) => `<option value="${key}" ${selectedAttr(key, item?.type || "expense")}>${meta.label}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="title">Nome</label>
            <input id="title" name="title" required placeholder="Ex: Mercado" value="${escapeAttr(item?.title || "")}" />
          </div>
          <div class="field">
            <label for="category">Categoria</label>
            <input id="category" name="category" required placeholder="Ex: Mercado" value="${escapeAttr(item?.category || "")}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="amount">Valor</label>
            <input id="amount" name="amount" required type="number" min="0" step="0.01" value="${item ? number(item.amount) : ""}" />
          </div>
          <div class="field">
            <label for="currency">Moeda</label>
            <select id="currency" name="currency">
              <option value="${currency}" ${selectedAttr(currency, selectedCurrency)}>${currency}</option>
              <option value="${currency === "JPY" ? "BRL" : "JPY"}" ${selectedAttr(currency === "JPY" ? "BRL" : "JPY", selectedCurrency)}>${currency === "JPY" ? "BRL" : "JPY"}</option>
            </select>
          </div>
          <div class="field">
            <label for="date">Data</label>
            <input id="date" name="date" type="date" required value="${escapeAttr(date)}" />
          </div>
        </div>
        <div class="field">
          <label for="note">Observacao</label>
          <textarea id="note" name="note">${escapeHtml(item?.note || "")}</textarea>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar</button>
        </div>
      </form>
    `;
  }

  function renderTransferModal(item = null) {
    const sentAmount = item ? number(item.sentAmount) : 230000;
    const feeAmount = item ? number(item.feeAmount) : 890;
    const rate = item ? number(item.rate) : latestRate(state.ui.selectedMonth);
    const date = item?.date || dateInMonth(state.ui.selectedMonth, 26);
    const receivedAmount = item ? number(item.receivedAmount) : "";
    return `
      <div class="modal-head">
        <h2>${item ? "Editar transferencia Wise" : "Nova transferencia Wise"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="transfer">
        ${editHidden(item)}
        <div class="three-cols">
          <div class="field">
            <label for="sentAmount">Valor enviado JPY</label>
            <input id="sentAmount" name="sentAmount" type="number" min="0" step="1" required value="${sentAmount}" />
          </div>
          <div class="field">
            <label for="feeAmount">Taxa JPY</label>
            <input id="feeAmount" name="feeAmount" type="number" min="0" step="1" required value="${feeAmount}" />
          </div>
          <div class="field">
            <label for="rate">Cotacao BRL por JPY</label>
            <input id="rate" name="rate" type="number" min="0" step="0.0001" required value="${rate}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="transferDate">Data</label>
            <input id="transferDate" name="date" type="date" required value="${escapeAttr(date)}" />
          </div>
          <div class="field">
            <label for="receivedAmount">Recebido BRL</label>
            <input id="receivedAmount" name="receivedAmount" type="number" min="0" step="0.01" required value="${receivedAmount}" />
          </div>
        </div>
        <div class="field">
          <label for="transferNote">Observacao</label>
          <textarea id="transferNote" name="note">${escapeHtml(item?.note || "Ponte para contas do Brasil")}</textarea>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar Wise</button>
        </div>
      </form>
    `;
  }

  function renderCommitmentModal(item = null) {
    const activeCountry = item?.country || (state.ui.activeCountry === "global" ? "japao" : state.ui.activeCountry);
    const selectedCurrency = item?.currency || countryMeta[activeCountry].currency;
    return `
      <div class="modal-head">
        <h2>${item ? "Editar conta fixa" : "Nova conta fixa"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="commitment">
        ${editHidden(item)}
        <div class="two-cols">
          ${countrySelect(activeCountry)}
          <div class="field">
            <label for="commitmentType">Tipo</label>
            <select id="commitmentType" name="type">
              <option value="expense" ${selectedAttr("expense", item?.type || "expense")}>Despesa</option>
              <option value="debt" ${selectedAttr("debt", item?.type)}>Financiamento</option>
              <option value="card" ${selectedAttr("card", item?.type)}>Cartao</option>
              <option value="consortium" ${selectedAttr("consortium", item?.type)}>Consorcio</option>
              <option value="investment" ${selectedAttr("investment", item?.type)}>Investimento</option>
            </select>
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="provider">Fornecedor</label>
            <input id="provider" name="provider" required placeholder="Ex: Santander" value="${escapeAttr(item?.provider || "")}" />
          </div>
          <div class="field">
            <label for="commitmentTitle">Nome</label>
            <input id="commitmentTitle" name="title" required placeholder="Ex: Financiamento" value="${escapeAttr(item?.title || "")}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="commitmentCategory">Categoria</label>
            <input id="commitmentCategory" name="category" required placeholder="Ex: Imovel" value="${escapeAttr(item?.category || "")}" />
          </div>
          <div class="field">
            <label for="commitmentAmount">Valor</label>
            <input id="commitmentAmount" name="amount" required type="number" min="0" step="0.01" value="${item ? number(item.amount) : ""}" />
          </div>
          <div class="field">
            <label for="dueDay">Vencimento</label>
            <input id="dueDay" name="dueDay" required type="number" min="1" max="31" value="${item?.dueDay || ""}" />
          </div>
        </div>
        <div class="field">
          <label for="commitmentCurrency">Moeda</label>
          <select id="commitmentCurrency" name="currency">
            <option value="${countryMeta[activeCountry].currency}" ${selectedAttr(countryMeta[activeCountry].currency, selectedCurrency)}>${countryMeta[activeCountry].currency}</option>
            <option value="${countryMeta[activeCountry].currency === "JPY" ? "BRL" : "JPY"}" ${selectedAttr(countryMeta[activeCountry].currency === "JPY" ? "BRL" : "JPY", selectedCurrency)}>${countryMeta[activeCountry].currency === "JPY" ? "BRL" : "JPY"}</option>
          </select>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="frequency">Frequencia</label>
            <select id="frequency" name="frequency">
              <option value="monthly" ${selectedAttr("monthly", item?.frequency || "monthly")}>Mensal</option>
              <option value="yearly" ${selectedAttr("yearly", item?.frequency)}>Anual</option>
              <option value="once" ${selectedAttr("once", item?.frequency)}>Uma vez</option>
            </select>
          </div>
          <div class="field">
            <label for="startMonth">A partir de</label>
            <input id="startMonth" name="startMonth" type="month" value="${escapeAttr(item?.startMonth || state.ui.selectedMonth)}" />
          </div>
          <div class="field">
            <label for="endMonth">Ate</label>
            <input id="endMonth" name="endMonth" type="month" value="${escapeAttr(item?.endMonth || "")}" />
          </div>
        </div>
        <div class="field">
          <label for="alertDays">Avisar quantos dias antes</label>
          <input id="alertDays" name="alertDays" type="number" min="0" max="60" value="${item?.alertDays ?? 3}" />
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar conta</button>
        </div>
      </form>
    `;
  }

  function renderDebtModal(item = null) {
    const activeCountry = item?.country || (state.ui.activeCountry === "global" ? "brasil" : state.ui.activeCountry);
    const selectedCurrency = item?.currency || countryMeta[activeCountry].currency;
    return `
      <div class="modal-head">
        <h2>${item ? "Editar contrato" : "Novo contrato"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="debt">
        ${editHidden(item)}
        <div class="two-cols">
          ${countrySelect(activeCountry)}
          <div class="field">
            <label for="debtType">Tipo</label>
            <select id="debtType" name="type">
              <option value="financing" ${selectedAttr("financing", item?.type || "financing")}>Financiamento</option>
              <option value="consortium" ${selectedAttr("consortium", item?.type)}>Consorcio</option>
              <option value="card" ${selectedAttr("card", item?.type)}>Cartao</option>
              <option value="device" ${selectedAttr("device", item?.type)}>Aparelho</option>
            </select>
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="debtProvider">Banco/empresa</label>
            <input id="debtProvider" name="provider" required value="${escapeAttr(item?.provider || "")}" />
          </div>
          <div class="field">
            <label for="debtTitle">Nome</label>
            <input id="debtTitle" name="title" required value="${escapeAttr(item?.title || "")}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="originalAmount">Valor original</label>
            <input id="originalAmount" name="originalAmount" required type="number" min="0" step="0.01" value="${item ? number(item.originalAmount) : ""}" />
          </div>
          <div class="field">
            <label for="outstandingAmount">Saldo devedor</label>
            <input id="outstandingAmount" name="outstandingAmount" required type="number" min="0" step="0.01" value="${item ? number(item.outstandingAmount) : ""}" />
          </div>
          <div class="field">
            <label for="installmentAmount">Parcela</label>
            <input id="installmentAmount" name="installmentAmount" required type="number" min="0" step="0.01" value="${item ? number(item.installmentAmount) : ""}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="debtCurrency">Moeda</label>
            <select id="debtCurrency" name="currency">
              <option value="${countryMeta[activeCountry].currency}" ${selectedAttr(countryMeta[activeCountry].currency, selectedCurrency)}>${countryMeta[activeCountry].currency}</option>
              <option value="${countryMeta[activeCountry].currency === "JPY" ? "BRL" : "JPY"}" ${selectedAttr(countryMeta[activeCountry].currency === "JPY" ? "BRL" : "JPY", selectedCurrency)}>${countryMeta[activeCountry].currency === "JPY" ? "BRL" : "JPY"}</option>
            </select>
          </div>
          <div class="field">
            <label for="debtDueDay">Vencimento</label>
            <input id="debtDueDay" name="dueDay" required type="number" min="1" max="31" value="${item?.dueDay || ""}" />
          </div>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar contrato</button>
        </div>
      </form>
    `;
  }

  function renderInvestmentModal(item = null) {
    const activeCountry = item?.country || (state.ui.activeCountry === "global" ? "japao" : state.ui.activeCountry);
    const selectedCurrency = item?.currency || countryMeta[activeCountry].currency;
    return `
      <div class="modal-head">
        <h2>${item ? "Editar investimento" : "Novo investimento"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="investment">
        ${editHidden(item)}
        <div class="two-cols">
          ${countrySelect(activeCountry)}
          <div class="field">
            <label for="investmentRisk">Risco</label>
            <select id="investmentRisk" name="risk">
              <option value="Baixa" ${selectedAttr("Baixa", item?.risk || "Baixa")}>Baixa</option>
              <option value="Media" ${selectedAttr("Media", item?.risk)}>Media</option>
              <option value="Alta" ${selectedAttr("Alta", item?.risk)}>Alta</option>
            </select>
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="investmentProvider">Instituicao</label>
            <input id="investmentProvider" name="provider" required value="${escapeAttr(item?.provider || "")}" />
          </div>
          <div class="field">
            <label for="investmentTitle">Nome</label>
            <input id="investmentTitle" name="title" required value="${escapeAttr(item?.title || "")}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="currentAmount">Valor atual</label>
            <input id="currentAmount" name="currentAmount" required type="number" min="0" step="0.01" value="${item ? number(item.currentAmount) : ""}" />
          </div>
          <div class="field">
            <label for="monthlyContribution">Aporte mensal</label>
            <input id="monthlyContribution" name="monthlyContribution" required type="number" min="0" step="0.01" value="${item ? number(item.monthlyContribution) : ""}" />
          </div>
          <div class="field">
            <label for="investmentCurrency">Moeda</label>
            <select id="investmentCurrency" name="currency">
              <option value="${countryMeta[activeCountry].currency}" ${selectedAttr(countryMeta[activeCountry].currency, selectedCurrency)}>${countryMeta[activeCountry].currency}</option>
              <option value="${countryMeta[activeCountry].currency === "JPY" ? "BRL" : "JPY"}" ${selectedAttr(countryMeta[activeCountry].currency === "JPY" ? "BRL" : "JPY", selectedCurrency)}>${countryMeta[activeCountry].currency === "JPY" ? "BRL" : "JPY"}</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar investimento</button>
        </div>
      </form>
    `;
  }

  function renderCreditCardModal(item = null) {
    const activeCountry = item?.country || (state.ui.activeCountry === "global" ? "japao" : state.ui.activeCountry);
    const currency = countryMeta[activeCountry].currency;
    const selectedCurrency = item?.currency || currency;
    return `
      <div class="modal-head">
        <h2>${item ? "Editar cartao" : "Novo cartao"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="credit-card">
        ${editHidden(item)}
        <div class="two-cols">
          ${countrySelect(activeCountry)}
          <div class="field">
            <label for="cardBrand">Bandeira</label>
            <select id="cardBrand" name="brand">
              ${["Visa", "Mastercard", "JCB", "Amex", "Elo", "Outro"].map((brand) => `<option value="${brand}" ${selectedAttr(brand, item?.brand || "Visa")}>${brand}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="cardIssuer">Banco/emissor</label>
            <input id="cardIssuer" name="issuer" required placeholder="Ex: Nubank" value="${escapeAttr(item?.issuer || "")}" />
          </div>
          <div class="field">
            <label for="cardNickname">Nome do cartao</label>
            <input id="cardNickname" name="nickname" required placeholder="Ex: Roxinho" value="${escapeAttr(item?.nickname || "")}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="cardLast4">Final</label>
            <input id="cardLast4" name="last4" inputmode="numeric" maxlength="4" placeholder="1234" value="${escapeAttr(item?.last4 || "")}" />
          </div>
          <div class="field">
            <label for="cardLimit">Limite</label>
            <input id="cardLimit" name="limitAmount" type="number" min="0" step="0.01" value="${item ? number(item.limitAmount) : 0}" />
          </div>
          <div class="field">
            <label for="cardBill">Fatura atual</label>
            <input id="cardBill" name="billAmount" type="number" min="0" step="0.01" value="${item ? number(item.billAmount) : 0}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="cardCurrency">Moeda</label>
            <select id="cardCurrency" name="currency">
              <option value="${currency}" ${selectedAttr(currency, selectedCurrency)}>${currency}</option>
              <option value="${currency === "JPY" ? "BRL" : "JPY"}" ${selectedAttr(currency === "JPY" ? "BRL" : "JPY", selectedCurrency)}>${currency === "JPY" ? "BRL" : "JPY"}</option>
            </select>
          </div>
          <div class="field">
            <label for="closingDay">Fechamento</label>
            <input id="closingDay" name="closingDay" type="number" min="1" max="31" value="${item?.closingDay || ""}" />
          </div>
          <div class="field">
            <label for="cardDueDay">Vencimento</label>
            <input id="cardDueDay" name="dueDay" type="number" min="1" max="31" value="${item?.dueDay || ""}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="cardBillMonth">Mes da fatura manual</label>
            <input id="cardBillMonth" name="billMonth" type="month" value="${escapeAttr(item?.billMonth || state.ui.selectedMonth)}" />
          </div>
          <div class="field">
            <label for="cardPaymentMethod">Como paga</label>
            <input id="cardPaymentMethod" name="paymentMethod" placeholder="Debito, Wise, conta..." value="${escapeAttr(item?.paymentMethod || "")}" />
          </div>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar cartao</button>
        </div>
      </form>
    `;
  }

  function renderCardPurchaseModal(item = null) {
    const cards = state.creditCards || [];
    const selectedCard = item ? creditCardById(item.cardId) : null;
    const fallbackCurrency = item?.currency || selectedCard?.currency || (state.ui.activeCountry === "brasil" ? "BRL" : "JPY");
    if (!cards.length) {
      return `
        <div class="modal-head">
          <h2>Nova compra</h2>
          <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
        </div>
        <div class="empty-action">
          <p class="empty-state">Cadastre um cartao antes de adicionar compras.</p>
          <button class="primary-button" type="button" data-action="open-modal" data-modal="creditCard">Cadastrar cartao</button>
        </div>
      `;
    }
    return `
      <div class="modal-head">
        <h2>${item ? "Editar compra no cartao" : "Nova compra no cartao"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="card-purchase">
        ${editHidden(item)}
        <div class="two-cols">
          <div class="field">
            <label for="purchaseCardId">Cartao</label>
            <select id="purchaseCardId" name="cardId">
              ${cards.map((card) => `<option value="${card.id}" ${selectedAttr(card.id, item?.cardId || cards[0]?.id)}>${escapeHtml(card.nickname || card.issuer)} - ${countryMeta[card.country]?.short || "JP"}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="purchaseCategory">Categoria</label>
            <input id="purchaseCategory" name="category" required placeholder="Ex: Mercado, iPhone" value="${escapeAttr(item?.category || "")}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="purchaseTitle">Compra</label>
            <input id="purchaseTitle" name="title" required placeholder="Ex: Apple, Amazon, Mercado" value="${escapeAttr(item?.title || "")}" />
          </div>
          <div class="field">
            <label for="purchaseDate">Data da compra</label>
            <input id="purchaseDate" name="purchaseDate" type="date" required value="${escapeAttr(item?.purchaseDate || dateInMonth(state.ui.selectedMonth, new Date().getDate()))}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="purchaseAmount">Valor total</label>
            <input id="purchaseAmount" name="totalAmount" required type="number" min="0" step="0.01" value="${item ? number(item.totalAmount) : ""}" />
          </div>
          <div class="field">
            <label for="purchaseCurrency">Moeda</label>
            <select id="purchaseCurrency" name="currency">
              <option value="${fallbackCurrency}" ${selectedAttr(fallbackCurrency, item?.currency || fallbackCurrency)}>${fallbackCurrency}</option>
              <option value="${fallbackCurrency === "JPY" ? "BRL" : "JPY"}" ${selectedAttr(fallbackCurrency === "JPY" ? "BRL" : "JPY", item?.currency)}>${fallbackCurrency === "JPY" ? "BRL" : "JPY"}</option>
            </select>
          </div>
          <div class="field">
            <label for="installments">Parcelas</label>
            <input id="installments" name="installments" type="number" min="1" max="60" value="${item?.installments || 1}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="firstBillMonth">Primeira fatura</label>
            <input id="firstBillMonth" name="firstBillMonth" type="month" required value="${escapeAttr(item?.firstBillMonth || state.ui.selectedMonth)}" />
          </div>
          <div class="field">
            <label for="purchaseNote">Observacao</label>
            <input id="purchaseNote" name="note" placeholder="Opcional" value="${escapeAttr(item?.note || "")}" />
          </div>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar compra</button>
        </div>
      </form>
    `;
  }

  function renderCryptoModal(item = null) {
    const symbol = String(item?.symbol || "BTC").toUpperCase();
    return `
      <div class="modal-head">
        <h2>${item ? "Editar cripto" : "Nova cripto"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="crypto">
        ${editHidden(item)}
        <div class="two-cols">
          <div class="field">
            <label for="cryptoSymbol">Cripto</label>
            <select id="cryptoSymbol" name="symbol">
              ${Object.entries(cryptoCatalog).map(([key, meta]) => `<option value="${key}" ${selectedAttr(key, symbol)}>${key} - ${meta.name}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="cryptoQuantity">Quantidade</label>
            <input id="cryptoQuantity" name="quantity" required type="number" min="0" step="0.00000001" placeholder="0.01" value="${item ? number(item.quantity) : ""}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="cryptoCost">Valor comprado</label>
            <input id="cryptoCost" name="costAmount" required type="number" min="0" step="0.01" value="${item ? number(item.costAmount) : ""}" />
          </div>
          <div class="field">
            <label for="cryptoCurrency">Moeda da compra</label>
            <select id="cryptoCurrency" name="costCurrency">
              <option value="JPY" ${selectedAttr("JPY", item?.costCurrency || "JPY")}>JPY</option>
              <option value="BRL" ${selectedAttr("BRL", item?.costCurrency)}>BRL</option>
            </select>
          </div>
          <div class="field">
            <label for="cryptoDate">Data</label>
            <input id="cryptoDate" name="purchaseDate" type="date" value="${escapeAttr(item?.purchaseDate || dateInMonth(state.ui.selectedMonth, new Date().getDate()))}" />
          </div>
        </div>
        <div class="field">
          <label for="cryptoNote">Observacao</label>
          <textarea id="cryptoNote" name="note" placeholder="Ex: compra na Binance">${escapeHtml(item?.note || "")}</textarea>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar cripto</button>
        </div>
      </form>
    `;
  }

  function renderVehicleModal() {
    const vehicle = state.vehicle || {};
    return `
      <div class="modal-head">
        <h2>Veiculo Japao</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="vehicle">
        <div class="two-cols">
          <div class="field">
            <label for="vehicleModel">Modelo do carro</label>
            <input id="vehicleModel" name="model" value="${escapeAttr(vehicle.model || "")}" placeholder="Ex: Toyota Prius" />
          </div>
          <div class="field">
            <label for="vehiclePlate">Placa</label>
            <input id="vehiclePlate" name="plate" value="${escapeAttr(vehicle.plate || "")}" placeholder="Ex: 00-00" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="shakenAmount">Valor do Shaken</label>
            <input id="shakenAmount" name="shakenAmount" type="number" min="0" step="1" value="${vehicle.shakenAmount || 0}" />
          </div>
          <div class="field">
            <label for="shakenDueDate">Vencimento do Shaken</label>
            <input id="shakenDueDate" name="shakenDueDate" type="date" value="${escapeAttr(vehicle.shakenDueDate || "")}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="insuranceAmount">Seguro mensal</label>
            <input id="insuranceAmount" name="insuranceAmount" type="number" min="0" step="1" value="${vehicle.insuranceAmount || 0}" />
          </div>
          <div class="field">
            <label for="insuranceDay">Dia da cobranca</label>
            <input id="insuranceDay" name="insuranceDay" type="number" min="1" max="31" value="${vehicle.insuranceDay || ""}" />
          </div>
          <div class="field">
            <label for="insurancePaymentMethod">Como paga</label>
            <input id="insurancePaymentMethod" name="insurancePaymentMethod" value="${escapeAttr(vehicle.insurancePaymentMethod || "")}" placeholder="Cartao, debito..." />
          </div>
        </div>
        <div class="field">
          <label for="insuranceCompany">Empresa do seguro</label>
          <input id="insuranceCompany" name="insuranceCompany" value="${escapeAttr(vehicle.insuranceCompany || "")}" placeholder="Ex: Sompo, Tokio Marine" />
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar veiculo</button>
        </div>
      </form>
    `;
  }

  function renderVehicleMaintenanceModal(item = null) {
    return `
      <div class="modal-head">
        <h2>${item ? "Editar manutencao" : "Nova manutencao"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="vehicle-maintenance">
        ${editHidden(item)}
        <div class="three-cols">
          <div class="field">
            <label for="maintenanceKind">Tipo</label>
            <select id="maintenanceKind" name="kind">
              ${["Troca de oleo", "Filtro", "Pneus", "Freio", "Bateria", "Manutencao geral", "Outro"].map((kind) => `<option value="${kind}" ${selectedAttr(kind, item?.kind || "Troca de oleo")}>${kind}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="maintenanceAmount">Valor pago</label>
            <input id="maintenanceAmount" name="amount" type="number" min="0" step="1" required value="${item ? number(item.amount) : ""}" />
          </div>
          <div class="field">
            <label for="maintenanceDate">Data</label>
            <input id="maintenanceDate" name="date" type="date" required value="${escapeAttr(item?.date || dateInMonth(state.ui.selectedMonth, new Date().getDate()))}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="maintenancePayment">Como pagou</label>
            <input id="maintenancePayment" name="paymentMethod" placeholder="Dinheiro, cartao, PayPay..." value="${escapeAttr(item?.paymentMethod || "")}" />
          </div>
          <div class="field">
            <label for="maintenanceLocation">Local</label>
            <input id="maintenanceLocation" name="location" placeholder="Ex: Autobacs" value="${escapeAttr(item?.location || "")}" />
          </div>
        </div>
        <div class="field">
          <label for="maintenanceNote">Observacao</label>
          <textarea id="maintenanceNote" name="note">${escapeHtml(item?.note || "")}</textarea>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar manutencao</button>
        </div>
      </form>
    `;
  }

  function renderIncomeSourceModal(item = null) {
    const nextColor = item?.color || sourceColors[(state.incomeSources || []).length % sourceColors.length];
    return `
      <div class="modal-head">
        <h2>${item ? "Editar empresa" : "Nova empresa"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="income-source">
        ${editHidden(item)}
        <div class="two-cols">
          <div class="field">
            <label for="sourceName">Nome</label>
            <input id="sourceName" name="name" required placeholder="Ex: Empresa, Amazon Flex" value="${escapeAttr(item?.name || "")}" />
          </div>
          <div class="field">
            <label for="sourceType">Tipo</label>
            <select id="sourceType" name="type">
              <option value="salary" ${selectedAttr("salary", item?.type || "salary")}>Salario Empresa</option>
              <option value="amazon" ${selectedAttr("amazon", item?.type)}>Amazon Flex</option>
              <option value="uber" ${selectedAttr("uber", item?.type)}>Uber Eats</option>
              <option value="extra" ${selectedAttr("extra", item?.type)}>Renda extra</option>
            </select>
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="sourceHourlyRate">Valor hora</label>
            <input id="sourceHourlyRate" name="hourlyRate" type="number" min="0" step="1" value="${item ? number(item.hourlyRate) : 0}" />
          </div>
          <div class="field">
            <label for="sourceColor">Cor</label>
            <input id="sourceColor" name="color" type="color" value="${nextColor}" />
          </div>
          <div class="field">
            <label for="sourceCurrency">Moeda</label>
            <select id="sourceCurrency" name="currency">
              <option value="JPY" ${selectedAttr("JPY", item?.currency || "JPY")}>JPY</option>
              <option value="BRL" ${selectedAttr("BRL", item?.currency)}>BRL</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="sourcePayRule">Regra de pagamento</label>
          <textarea id="sourcePayRule" name="payRule" placeholder="Ex: Amazon Flex quarta a terca, paga na quarta">${escapeHtml(item?.payRule || "")}</textarea>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar empresa</button>
        </div>
      </form>
    `;
  }

  function renderWorkIncomeModal(item = null) {
    const sources = state.incomeSources || [];
    if (!sources.length) {
      return `
        <div class="modal-head">
          <h2>Novo recebimento</h2>
          <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
        </div>
        <div class="form-grid">
          <p class="empty-state">Cadastre uma empresa ou fonte de renda primeiro.</p>
          <div class="form-actions">
            <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
            <button class="primary-button" type="button" data-action="open-modal" data-modal="incomeSource">Cadastrar empresa</button>
          </div>
        </div>
      `;
    }
    return `
      <div class="modal-head">
        <h2>${item ? "Editar recebimento" : "Novo recebimento"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="work-income">
        ${editHidden(item)}
        <div class="three-cols">
          <div class="field">
            <label for="incomeSourceId">Fonte</label>
            <select id="incomeSourceId" name="sourceId">
              ${sources.map((source) => `<option value="${source.id}" ${selectedAttr(source.id, item?.sourceId || sources[0]?.id)}>${escapeHtml(source.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="incomeAmount">Valor recebido</label>
            <input id="incomeAmount" name="amount" type="number" min="0" step="1" required value="${item ? number(item.amount) : ""}" />
          </div>
          <div class="field">
            <label for="incomeDate">Data de pagamento</label>
            <input id="incomeDate" name="date" type="date" required value="${escapeAttr(item?.date || dateInMonth(state.ui.selectedMonth, new Date().getDate()))}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="incomePeriodStart">Inicio do periodo</label>
            <input id="incomePeriodStart" name="periodStart" type="date" value="${escapeAttr(item?.periodStart || "")}" />
          </div>
          <div class="field">
            <label for="incomePeriodEnd">Fim do periodo</label>
            <input id="incomePeriodEnd" name="periodEnd" type="date" value="${escapeAttr(item?.periodEnd || "")}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="workDays">Dias trabalhados</label>
            <input id="workDays" name="workDays" type="number" min="0" step="1" value="${item ? number(item.workDays) : 0}" />
          </div>
          <div class="field">
            <label for="hirukinDays">Hirukin</label>
            <input id="hirukinDays" name="hirukinDays" type="number" min="0" step="1" value="${item ? number(item.hirukinDays) : 0}" />
          </div>
          <div class="field">
            <label for="yakinDays">Yakin</label>
            <input id="yakinDays" name="yakinDays" type="number" min="0" step="1" value="${item ? number(item.yakinDays) : 0}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="weekendDays">Finais de semana</label>
            <input id="weekendDays" name="weekendDays" type="number" min="0" step="1" value="${item ? number(item.weekendDays) : 0}" />
          </div>
          <div class="field">
            <label for="incomeHourlyRate">Valor hora usado</label>
            <input id="incomeHourlyRate" name="hourlyRate" type="number" min="0" step="1" value="${item ? number(item.hourlyRate) : 0}" />
          </div>
        </div>
        <div class="field">
          <label for="incomeNote">Observacao</label>
          <textarea id="incomeNote" name="note" placeholder="Ex: semana Amazon Flex quarta a terca">${escapeHtml(item?.note || "")}</textarea>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar recebimento</button>
        </div>
      </form>
    `;
  }

  function countrySelect(selected) {
    return `
      <div class="field">
        <label for="country">Pais</label>
        <select id="country" name="country">
          <option value="brasil" ${selected === "brasil" ? "selected" : ""}>Brasil</option>
          <option value="japao" ${selected === "japao" ? "selected" : ""}>Japao</option>
        </select>
      </div>
    `;
  }

  function saveTransaction(form) {
    const data = formData(form);
    const updated = upsertItem("transactions", data.id, {
      date: data.date,
      country: data.country,
      type: data.type,
      title: data.title.trim(),
      category: data.category.trim(),
      amount: number(data.amount),
      currency: data.currency,
      note: data.note.trim()
    }, true);
    state.ui.selectedMonth = data.date.slice(0, 7);
    saveState();
    closeModal();
    render();
    showToast(updated ? "Lancamento atualizado." : "Lancamento salvo.");
  }

  function saveTransfer(form) {
    const data = formData(form);
    const sentAmount = number(data.sentAmount);
    const feeAmount = number(data.feeAmount);
    const rate = number(data.rate);
    const receivedAmount = number(data.receivedAmount || ((sentAmount - feeAmount) * rate));

    const updated = upsertItem("transfers", data.id, {
      date: data.date,
      method: "Wise",
      fromCountry: "japao",
      toCountry: "brasil",
      sentAmount,
      sentCurrency: "JPY",
      feeAmount,
      feeCurrency: "JPY",
      rate,
      receivedAmount,
      receivedCurrency: "BRL",
      note: data.note.trim()
    }, true);
    state.settings.defaultRate = rate || state.settings.defaultRate;
    state.ui.selectedMonth = data.date.slice(0, 7);
    saveState();
    closeModal();
    render();
    showToast(updated ? "Transferencia Wise atualizada." : "Transferencia Wise salva.");
  }

  function saveCommitment(form) {
    const data = formData(form);
    const current = findItem("commitments", data.id);
    const updated = upsertItem("commitments", data.id, {
      country: data.country,
      provider: data.provider.trim(),
      title: data.title.trim(),
      category: data.category.trim(),
      type: data.type,
      amount: number(data.amount),
      currency: data.currency,
      dueDay: clamp(Math.round(number(data.dueDay)), 1, 31),
      frequency: data.frequency || "monthly",
      startMonth: data.startMonth || "",
      endMonth: data.endMonth || "",
      alertDays: clamp(Math.round(number(data.alertDays)), 0, 60),
      active: current?.active !== false
    });
    saveState();
    closeModal();
    render();
    showToast(updated ? "Conta fixa atualizada." : "Conta fixa salva.");
  }

  function saveDebt(form) {
    const data = formData(form);
    const updated = upsertItem("debts", data.id, {
      country: data.country,
      provider: data.provider.trim(),
      title: data.title.trim(),
      type: data.type,
      originalAmount: number(data.originalAmount),
      outstandingAmount: number(data.outstandingAmount),
      installmentAmount: number(data.installmentAmount),
      currency: data.currency,
      dueDay: clamp(Math.round(number(data.dueDay)), 1, 31)
    });
    saveState();
    closeModal();
    render();
    showToast(updated ? "Contrato atualizado." : "Contrato salvo.");
  }

  function saveInvestment(form) {
    const data = formData(form);
    const updated = upsertItem("investments", data.id, {
      country: data.country,
      provider: data.provider.trim(),
      title: data.title.trim(),
      currentAmount: number(data.currentAmount),
      monthlyContribution: number(data.monthlyContribution),
      currency: data.currency,
      risk: data.risk
    });
    saveState();
    closeModal();
    render();
    showToast(updated ? "Investimento atualizado." : "Investimento salvo.");
  }

  function saveCreditCard(form) {
    const data = formData(form);
    const updated = upsertItem("creditCards", data.id, {
      country: data.country,
      issuer: data.issuer.trim(),
      nickname: data.nickname.trim(),
      brand: data.brand,
      last4: String(data.last4 || "").replace(/\D/g, "").slice(-4),
      limitAmount: number(data.limitAmount),
      billAmount: number(data.billAmount),
      billMonth: data.billMonth || state.ui.selectedMonth,
      currency: data.currency,
      closingDay: data.closingDay ? clamp(Math.round(number(data.closingDay)), 1, 31) : "",
      dueDay: data.dueDay ? clamp(Math.round(number(data.dueDay)), 1, 31) : "",
      paymentMethod: data.paymentMethod.trim()
    });
    saveState();
    closeModal();
    render();
    showToast(updated ? "Cartao atualizado." : "Cartao salvo.");
  }

  function saveCardPurchase(form) {
    const data = formData(form);
    const card = creditCardById(data.cardId);
    if (!card) {
      showToast("Cartao nao encontrado.");
      return;
    }
    const updated = upsertItem("cardPurchases", data.id, {
      cardId: data.cardId,
      country: card.country,
      title: data.title.trim(),
      category: data.category.trim(),
      totalAmount: number(data.totalAmount),
      currency: data.currency || card.currency,
      installments: clamp(Math.round(number(data.installments)), 1, 60),
      firstBillMonth: data.firstBillMonth || state.ui.selectedMonth,
      purchaseDate: data.purchaseDate,
      note: data.note.trim()
    }, true);
    state.ui.selectedMonth = data.firstBillMonth || state.ui.selectedMonth;
    saveState();
    closeModal();
    render();
    showToast(updated ? "Compra atualizada." : "Compra salva no cartao.");
  }

  function saveCryptoAsset(form) {
    const data = formData(form);
    const symbol = String(data.symbol || "BTC").toUpperCase();
    const updated = upsertItem("cryptoAssets", data.id, {
      symbol,
      quantity: number(data.quantity),
      costAmount: number(data.costAmount),
      costCurrency: data.costCurrency,
      purchaseDate: data.purchaseDate || dateInMonth(state.ui.selectedMonth, new Date().getDate()),
      note: data.note.trim()
    });
    saveState();
    closeModal();
    render();
    refreshCryptoQuotes(true);
    showToast(updated ? "Cripto atualizada." : "Cripto salva.");
  }

  function saveVehicle(form) {
    const data = formData(form);
    state.vehicle = {
      model: data.model.trim(),
      plate: data.plate.trim(),
      shakenAmount: number(data.shakenAmount),
      shakenDueDate: data.shakenDueDate,
      insuranceAmount: number(data.insuranceAmount),
      insuranceDay: data.insuranceDay ? clamp(Math.round(number(data.insuranceDay)), 1, 31) : "",
      insuranceCompany: data.insuranceCompany.trim(),
      insurancePaymentMethod: data.insurancePaymentMethod.trim(),
      currency: "JPY"
    };
    saveState();
    closeModal();
    render();
    showToast("Veiculo salvo.");
  }

  function saveVehicleMaintenance(form) {
    const data = formData(form);
    const updated = upsertItem("vehicleMaintenance", data.id, {
      country: "japao",
      kind: data.kind,
      amount: number(data.amount),
      currency: "JPY",
      date: data.date,
      paymentMethod: data.paymentMethod.trim(),
      location: data.location.trim(),
      note: data.note.trim()
    }, true);
    state.ui.selectedMonth = data.date.slice(0, 7);
    saveState();
    closeModal();
    render();
    showToast(updated ? "Manutencao atualizada." : "Manutencao salva.");
  }

  function saveIncomeSource(form) {
    const data = formData(form);
    const updated = upsertItem("incomeSources", data.id, {
      name: data.name.trim(),
      type: data.type,
      hourlyRate: number(data.hourlyRate),
      color: data.color || sourceColors[state.incomeSources.length % sourceColors.length],
      currency: data.currency || "JPY",
      payRule: data.payRule.trim()
    });
    saveState();
    closeModal();
    render();
    showToast(updated ? "Empresa atualizada." : "Empresa salva.");
  }

  function saveWorkIncome(form) {
    const data = formData(form);
    const source = incomeSourceById(data.sourceId);
    const updated = upsertItem("workIncomes", data.id, {
      sourceId: data.sourceId,
      sourceName: source.name,
      sourceType: source.type,
      amount: number(data.amount),
      currency: source.currency || "JPY",
      date: data.date,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      workDays: number(data.workDays),
      hirukinDays: number(data.hirukinDays),
      yakinDays: number(data.yakinDays),
      weekendDays: number(data.weekendDays),
      hourlyRate: number(data.hourlyRate) || number(source.hourlyRate),
      note: data.note.trim()
    }, true);
    state.ui.selectedMonth = data.date.slice(0, 7);
    saveState();
    closeModal();
    render();
    showToast(updated ? "Recebimento atualizado." : "Recebimento salvo.");
  }

  function saveSettings(form) {
    const data = formData(form);
    state.settings.familyName = data.familyName.trim() || "Familia";
    state.settings.salaryDay = clamp(Math.round(number(data.salaryDay)), 1, 31);
    state.settings.defaultRate = number(data.defaultRate) || state.settings.defaultRate;
    state.settings.baseCurrency = data.baseCurrency;
    saveState();
    updateRemoteHouseholdName(state.settings.familyName).catch((error) => {
      remoteSession.error = error.message || "Falha ao atualizar familia.";
    });
    render();
    showToast("Ajustes salvos.");
  }

  function payCommitment(id) {
    const item = state.commitments.find((entry) => entry.id === id);
    if (!item) return;
    const key = commitmentKey(id, state.ui.selectedMonth);
    if (state.paidCommitments[key]) {
      showToast("Conta ja marcada como paga.");
      return;
    }

    state.paidCommitments[key] = true;
    state.transactions.unshift({
      id: uid("tx"),
      date: dateInMonth(state.ui.selectedMonth, item.dueDay),
      country: item.country,
      type: item.type,
      title: item.title,
      category: item.category,
      amount: item.amount,
      currency: item.currency,
      note: "Criado a partir de conta fixa"
    });
    saveState();
    render();
    showToast("Conta lancada no mes.");
  }

  function payCardBill(id) {
    const card = creditCardById(id);
    if (!card) return;
    const month = state.ui.selectedMonth;
    const key = cardBillKey(id, month);
    if (state.paidCommitments[key]) {
      showToast("Fatura ja marcada como paga.");
      return;
    }

    const bill = creditCardMonthBill(card, month);
    if (!bill.total) {
      showToast("Esta fatura esta zerada.");
      return;
    }

    state.paidCommitments[key] = true;
    state.transactions.unshift({
      id: uid("tx"),
      date: dateInMonth(month, card.dueDay || 1),
      country: card.country,
      type: "card",
      title: `Fatura ${card.nickname || card.issuer}`,
      category: "Cartao",
      amount: bill.total,
      currency: card.currency,
      note: card.paymentMethod ? `Pago via ${card.paymentMethod}` : "Fatura do cartao"
    });
    saveState();
    render();
    showToast("Fatura lancada no mes.");
  }

  function deleteItem(collection, id, message) {
    const current = state[collection];
    if (!Array.isArray(current)) return;
    const item = current.find((entry) => entry.id === id);
    if (!item) return;
    const ok = window.confirm("Excluir este item?");
    if (!ok) return;
    state[collection] = current.filter((entry) => entry.id !== id);
    saveState();
    render();
    showToast(message);
  }

  function resetDemo() {
    const ok = window.confirm(remoteStore.enabled ? "Resetar dados desta familia na nuvem?" : "Resetar todos os dados locais?");
    if (!ok) return;
    state = createInitialState();
    if (remoteStore.enabled && remoteSession.status === "ready") state.settings.dataMode = "online";
    saveState();
    render();
    showToast("Dados resetados.");
  }

  function updateTransferPreview() {
    const form = modalRoot.querySelector("[data-form='transfer']");
    if (!form) return;
    const sent = number(form.sentAmount.value);
    const fee = number(form.feeAmount.value);
    const rate = number(form.rate.value);
    form.receivedAmount.value = Math.max(0, round((sent - fee) * rate, 2));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ponte-financeira-${state.ui.selectedMonth}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Backup exportado.");
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = normalizeState(JSON.parse(reader.result));
        saveState();
        render();
        showToast("Backup importado.");
      } catch (error) {
        showToast("Arquivo invalido.");
      }
    };
    reader.readAsText(file);
  }

  function drawVisibleCharts() {
    const trend = document.getElementById("trend-chart");
    if (trend) drawTrendChart(trend);
    const category = document.getElementById("category-chart");
    if (category) drawCategoryChart(category);
    const country = document.getElementById("country-chart");
    if (country) drawCountryChart(country);
    const crypto = document.getElementById("crypto-donut-chart");
    if (crypto) drawCryptoDonutChart(crypto);
  }

  function drawTrendChart(canvas) {
    const ctx = prepCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const months = recentMonthsFrom(state.ui.selectedMonth, 6);
    const series = months.map((month) => {
      const s = summarizeMonth(month, state.ui.activeCountry);
      return {
        label: shortMonthLabel(month),
        income: Math.max(0, s.income + s.bridgeIn),
        outflow: Math.max(0, s.expenses + s.investments + s.wiseOut + s.fees),
        remaining: s.remaining,
        currency: s.currency
      };
    });
    const maxValue = Math.max(1, ...series.flatMap((entry) => [entry.income, entry.outflow, Math.abs(entry.remaining)]));
    const padding = { top: 24, right: 14, bottom: 38, left: 14 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const gap = 10;
    const slot = chartW / series.length;
    const barW = Math.max(8, (slot - gap) / 2.4);

    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx, padding, chartW, chartH, width);

    series.forEach((entry, index) => {
      const x = padding.left + index * slot + slot / 2;
      const incomeH = (entry.income / maxValue) * chartH;
      const outH = (entry.outflow / maxValue) * chartH;
      const yBase = padding.top + chartH;
      roundRect(ctx, x - barW - 2, yBase - incomeH, barW, incomeH, 5, "#42a67a");
      roundRect(ctx, x + 2, yBase - outH, barW, outH, 5, "#d95d4e");
      ctx.fillStyle = "#766f62";
      ctx.font = "700 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(entry.label, x, height - 14);
    });

    drawLegend(ctx, [
      ["Entradas", "#42a67a"],
      ["Saidas", "#d95d4e"]
    ], 12, 14);
  }

  function drawCategoryChart(canvas) {
    const ctx = prepCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const data = categoryTotals(state.ui.selectedMonth, state.ui.activeCountry);
    const maxValue = Math.max(1, ...data.map((item) => item.value));
    const top = 28;
    const left = 92;
    const right = 18;
    const rowH = Math.min(34, (height - top - 20) / Math.max(1, data.length));

    ctx.clearRect(0, 0, width, height);
    drawLegend(ctx, [["Gastos", "#f5c84c"]], 12, 14);

    if (!data.length) {
      drawEmptyChart(ctx, width, height, "Sem gastos no mes");
      return;
    }

    data.slice(0, 6).forEach((item, index) => {
      const y = top + index * rowH + 6;
      const barW = ((width - left - right) * item.value) / maxValue;
      ctx.fillStyle = "#2b2924";
      ctx.font = "750 11px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(trimLabel(item.category, 12), 12, y + 12);
      roundRect(ctx, left, y, barW, 16, 5, index % 2 ? "#f5c84c" : "#42a67a");
      ctx.fillStyle = "#766f62";
      ctx.font = "700 10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(formatCompact(item.value, item.currency), width - 12, y + 12);
    });
  }

  function drawCountryChart(canvas) {
    const ctx = prepCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const month = state.ui.selectedMonth;
    const br = summarizeMonth(month, "brasil");
    const jp = summarizeMonth(month, "japao");
    const rate = latestRate(month);
    const brOut = convert(br.expenses + br.investments, "BRL", "JPY", rate);
    const jpOut = jp.expenses + jp.investments + jp.wiseOut;
    const total = Math.max(1, brOut + jpOut);
    const centerX = width / 2;
    const centerY = height / 2 + 8;
    const radius = Math.min(width, height) * 0.27;
    const brAngle = (brOut / total) * Math.PI * 2;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = Math.max(18, radius * 0.28);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.strokeStyle = "#42a67a";
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + brAngle);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "#f5c84c";
    ctx.arc(centerX, centerY, radius, -Math.PI / 2 + brAngle + 0.08, Math.PI * 1.5 - 0.04);
    ctx.stroke();

    ctx.fillStyle = "#11110f";
    ctx.font = "950 24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round((brOut / total) * 100)}% BR`, centerX, centerY + 6);
    ctx.fillStyle = "#766f62";
    ctx.font = "750 12px system-ui";
    ctx.fillText("saidas convertidas", centerX, centerY + 26);
    drawLegend(ctx, [
      [`Brasil ${formatCompact(brOut, "JPY")}`, "#42a67a"],
      [`Japao ${formatCompact(jpOut, "JPY")}`, "#f5c84c"]
    ], 12, 14);
  }

  function drawCryptoDonutChart(canvas) {
    const ctx = prepCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const rows = cryptoAssetRows();
    const total = rows.reduce((amount, item) => amount + item.value, 0);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.34;
    let start = -Math.PI / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = Math.max(16, radius * 0.22);
    ctx.lineCap = "round";

    if (!rows.length || !total) {
      ctx.beginPath();
      ctx.strokeStyle = "#ded4c4";
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    rows.forEach((item) => {
      const slice = (item.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.arc(centerX, centerY, radius, start + 0.04, start + slice - 0.04);
      ctx.stroke();
      start += slice;
    });
  }

  function scheduleCryptoRefresh(force) {
    clearTimeout(cryptoRefreshTimer);
    if (!(state.cryptoAssets || []).length) return;
    cryptoRefreshTimer = setTimeout(() => scheduleCryptoRefresh(false), 60000);
    const updatedAt = state.cryptoQuotes?.updatedAt ? new Date(state.cryptoQuotes.updatedAt).getTime() : 0;
    const stale = Date.now() - updatedAt > 60000;
    if (force || stale) refreshCryptoQuotes(force);
  }

  async function refreshCryptoQuotes(force) {
    if (cryptoFetchInFlight) return;
    const assets = state.cryptoAssets || [];
    if (!assets.length) return;
    const ids = Array.from(new Set(assets.map((item) => cryptoCatalog[item.symbol]?.id).filter(Boolean)));
    if (!ids.length) return;
    const updatedAt = state.cryptoQuotes?.updatedAt ? new Date(state.cryptoQuotes.updatedAt).getTime() : 0;
    if (!force && Date.now() - updatedAt < 60000) return;

    cryptoFetchInFlight = true;
    state.cryptoQuotes = {
      ...(state.cryptoQuotes || {}),
      prices: state.cryptoQuotes?.prices || {},
      status: "loading"
    };
    render();

    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=jpy,brl,usd&include_24hr_change=true`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao buscar cotacoes");
      const data = await response.json();
      const prices = {};

      Object.entries(cryptoCatalog).forEach(([symbol, meta]) => {
        const quote = data[meta.id];
        if (!quote) return;
        prices[symbol] = {
          JPY: Number(quote.jpy || 0),
          BRL: Number(quote.brl || 0),
          USD: Number(quote.usd || 0),
          change24h: Number(quote.jpy_24h_change || quote.brl_24h_change || quote.usd_24h_change || 0)
        };
      });

      state.cryptoQuotes = {
        prices,
        updatedAt: new Date().toISOString(),
        status: "ok"
      };
      saveState();
      render();
    } catch (error) {
      state.cryptoQuotes = {
        ...(state.cryptoQuotes || {}),
        prices: state.cryptoQuotes?.prices || {},
        updatedAt: state.cryptoQuotes?.updatedAt || null,
        status: "error"
      };
      saveState();
      render();
      showToast("Nao consegui atualizar as cotacoes agora.");
    } finally {
      cryptoFetchInFlight = false;
    }
  }

  function scheduleFxRefresh(force) {
    clearTimeout(fxRefreshTimer);
    fxRefreshTimer = setTimeout(() => scheduleFxRefresh(false), 300000);
    if (fxFetchInFlight) return;
    const updatedAt = state.fxQuotes?.updatedAt ? new Date(state.fxQuotes.updatedAt).getTime() : 0;
    const stale = Date.now() - updatedAt > 300000;
    if (force || stale) refreshFxQuotes(force);
  }

  async function refreshFxQuotes(force) {
    if (fxFetchInFlight) return;
    const updatedAt = state.fxQuotes?.updatedAt ? new Date(state.fxQuotes.updatedAt).getTime() : 0;
    if (!force && Date.now() - updatedAt < 300000) return;

    fxFetchInFlight = true;
    state.fxQuotes = {
      ...(state.fxQuotes || {}),
      status: "loading"
    };
    render();

    try {
      const quotes = await fetchFxQuotes();

      state.fxQuotes = {
        usdBrl: quotes.usdBrl,
        jpyBrl: quotes.jpyBrl,
        usdJpy: quotes.usdJpy,
        btcUsd: quotes.btcUsd || state.fxQuotes?.btcUsd || 0,
        source: quotes.source,
        ratesDate: quotes.date || "",
        updatedAt: new Date().toISOString(),
        status: "ok"
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      render();
    } catch (error) {
      state.fxQuotes = {
        ...(state.fxQuotes || {}),
        status: "error"
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      render();
      showToast("Nao consegui atualizar dolar/iene agora.");
    } finally {
      fxFetchInFlight = false;
    }
  }

  async function fetchFxQuotes() {
    const fiat = await fetchFiatFxQuotes();
    const btcUsd = await fetchBtcUsdQuote().catch(() => Number(state.fxQuotes?.btcUsd || 0));
    return {
      ...fiat,
      btcUsd
    };
  }

  async function fetchFiatFxQuotes() {
    try {
      return await fetchAwesomeFxQuotes();
    } catch (error) {
      return fetchOpenExchangeQuotes();
    }
  }

  async function fetchAwesomeFxQuotes() {
    const response = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,JPY-BRL,USD-JPY", { cache: "no-store" });
    if (!response.ok) throw new Error("Falha na cotacao BR");
    const data = await response.json();
    const usdBrl = Number(data.USDBRL?.bid || data.USDBRL?.ask || 0);
    const jpyBrl = Number(data.JPYBRL?.bid || data.JPYBRL?.ask || 0);
    const usdJpy = Number(data.USDJPY?.bid || data.USDJPY?.ask || 0) || (jpyBrl ? usdBrl / jpyBrl : 0);
    if (!usdBrl || !jpyBrl || !Number.isFinite(usdJpy) || !usdJpy) throw new Error("Cotacao BR vazia");
    return {
      usdBrl,
      jpyBrl,
      usdJpy,
      source: "AwesomeAPI",
      date: data.USDBRL?.create_date || data.USDJPY?.create_date || data.JPYBRL?.create_date || ""
    };
  }

  async function fetchOpenExchangeQuotes() {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!response.ok) throw new Error("Falha na cotacao global");
    const data = await response.json();
    const brl = Number(data.rates?.BRL || 0);
    const jpy = Number(data.rates?.JPY || 0);
    if (!brl || !jpy) throw new Error("Cotacao global vazia");
    return {
      usdBrl: brl,
      jpyBrl: brl / jpy,
      usdJpy: jpy,
      source: "Open ER",
      date: data.time_last_update_utc || data.time_last_update_unix || ""
    };
  }

  async function fetchBtcUsdQuote() {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", { cache: "no-store" });
    if (!response.ok) throw new Error("Falha na cotacao BTC");
    const data = await response.json();
    const btcUsd = Number(data.bitcoin?.usd || 0);
    if (!btcUsd) throw new Error("Cotacao BTC vazia");
    return btcUsd;
  }

  function fxStatusText() {
    const status = state.fxQuotes?.status || "idle";
    if (status === "loading") return { label: "Atualizando", tone: "blue" };
    if (status === "error") return { label: "Offline", tone: "red" };
    if (!state.fxQuotes?.updatedAt) return { label: "Sem cotacao", tone: "gold" };
    return { label: formatTime(state.fxQuotes.updatedAt), tone: "green" };
  }

  function cryptoSummary() {
    const currency = state.settings.baseCurrency || "JPY";
    const rows = cryptoAssetRows(currency);
    const totalValue = sum(rows, "value");
    const totalCost = sum(rows, "cost");
    const pnl = totalValue - totalCost;
    const pnlPct = totalCost ? round((pnl / totalCost) * 100, 2) : 0;
    return { currency, totalValue, totalCost, pnl, pnlPct };
  }

  function cryptoAssetRows(currency = state.settings.baseCurrency || "JPY") {
    const rate = latestRate(state.ui.selectedMonth);
    return (state.cryptoAssets || []).map((item) => {
      const symbol = String(item.symbol || "BTC").toUpperCase();
      const meta = cryptoCatalog[symbol] || { name: symbol, color: "#f5c84c" };
      const quantity = number(item.quantity);
      const cost = convert(number(item.costAmount), item.costCurrency || currency, currency, rate);
      const average = quantity ? cost / quantity : 0;
      const price = cryptoPrice(symbol, currency) || average;
      const value = price * quantity;
      const pnl = value - cost;
      return {
        id: item.id,
        symbol,
        name: meta.name,
        color: meta.color,
        quantity,
        cost,
        price,
        value,
        pnl,
        currency
      };
    }).sort((a, b) => b.value - a.value);
  }

  function cryptoPrice(symbol, currency) {
    const quote = state.cryptoQuotes?.prices?.[symbol];
    if (!quote) return 0;
    return Number(quote[currency] || 0);
  }

  function cryptoStatusText() {
    const status = state.cryptoQuotes?.status || "idle";
    if (status === "loading") return { label: "Atualizando", tone: "blue" };
    if (status === "error") return { label: "Cotacao offline", tone: "red" };
    if (!state.cryptoQuotes?.updatedAt) return { label: "Sem cotacao", tone: "gold" };
    return { label: `Atualizado ${formatTime(state.cryptoQuotes.updatedAt)}`, tone: "green" };
  }

  function prepCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 240;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return ctx;
  }

  function drawGrid(ctx, padding, chartW, chartH, width) {
    ctx.strokeStyle = "rgba(118, 111, 98, 0.22)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i += 1) {
      const y = padding.top + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }

  function drawLegend(ctx, items, x, y) {
    let cursor = x;
    items.forEach(([label, color]) => {
      ctx.fillStyle = color;
      roundRect(ctx, cursor, y - 8, 10, 10, 4, color);
      ctx.fillStyle = "#766f62";
      ctx.font = "750 11px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(label, cursor + 15, y + 1);
      cursor += ctx.measureText(label).width + 42;
    });
  }

  function drawEmptyChart(ctx, width, height, label) {
    ctx.fillStyle = "#766f62";
    ctx.font = "800 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(label, width / 2, height / 2);
  }

  function roundRect(ctx, x, y, w, h, r, color) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.fill();
  }

  function summarizeMonth(month, country) {
    const targetCurrency = country === "brasil" ? "BRL" : state.settings.baseCurrency || "JPY";
    const rate = latestRate(month);
    const txs = monthTransactions(month, country);
    const transfers = monthTransfers(month);
    let income = 0;
    let expenses = 0;
    let investments = 0;
    let bridgeIn = 0;
    let wiseOut = 0;
    let fees = 0;
    let actualIncome = 0;
    let actualExpenses = 0;
    let actualInvestments = 0;
    let actualBridgeIn = 0;
    let actualWiseOut = 0;
    let actualFees = 0;
    let plannedExpenses = 0;
    let plannedInvestments = 0;

    txs.forEach((item) => {
      const converted = convert(item.amount, item.currency, targetCurrency, rate);
      if (item.type === "income") {
        income += converted;
        actualIncome += converted;
      }
      if (outflowTypes.includes(item.type)) {
        expenses += converted;
        actualExpenses += converted;
      }
      if (item.type === "investment") {
        investments += converted;
        actualInvestments += converted;
      }
    });

    plannedCommitmentEntries(month, country).forEach((item) => {
      const converted = convert(item.amount, item.currency, targetCurrency, rate);
      if (item.type === "investment") {
        investments += converted;
        plannedInvestments += converted;
      } else {
        expenses += converted;
        plannedExpenses += converted;
      }
    });

    plannedCardBillEntries(month, country).forEach((item) => {
      const converted = convert(item.amount, item.currency, targetCurrency, rate);
      expenses += converted;
      plannedExpenses += converted;
    });

    if (country === "global" || country === "japao") {
      vehicleMonthlyCosts(month).forEach((item) => {
        const converted = convert(item.amount, item.currency, targetCurrency, rate);
        expenses += converted;
        if (item.id === "vehicle-insurance" || item.id === "vehicle-shaken") plannedExpenses += converted;
        else actualExpenses += converted;
      });
      monthWorkIncomes(month).forEach((item) => {
        const converted = convert(item.amount, item.currency || "JPY", targetCurrency, rate);
        income += converted;
        actualIncome += converted;
      });
    }

    if (country === "brasil") {
      bridgeIn = convert(sum(transfers, "receivedAmount"), "BRL", targetCurrency, rate);
      actualBridgeIn = bridgeIn;
    } else if (country === "japao") {
      wiseOut = convert(sum(transfers, "sentAmount"), "JPY", targetCurrency, rate);
      actualWiseOut = wiseOut;
    } else {
      fees = convert(sum(transfers, "feeAmount"), "JPY", targetCurrency, rate);
      actualFees = fees;
    }

    const planned = expenses + investments + wiseOut + fees;
    const remaining = income + bridgeIn - planned;
    const coverage = planned ? clamp(Math.round(((income + bridgeIn) / planned) * 100), 0, 999) : 100;
    const actualOutflow = actualExpenses + actualInvestments + actualWiseOut + actualFees;
    const plannedOutflow = plannedExpenses + plannedInvestments;
    const actualInflow = actualIncome + actualBridgeIn;
    const projectedInflow = income + bridgeIn;
    const projectedOutflow = planned;
    const actualBalance = actualInflow - actualOutflow;
    const plannedBalance = 0 - plannedOutflow;

    return {
      currency: targetCurrency,
      income,
      expenses,
      investments,
      bridgeIn,
      wiseOut,
      fees,
      remaining,
      coverage,
      actualIncome,
      actualExpenses,
      actualInvestments,
      actualBridgeIn,
      actualWiseOut,
      actualFees,
      actualInflow,
      actualOutflow,
      actualBalance,
      plannedExpenses,
      plannedInvestments,
      plannedOutflow,
      plannedBalance,
      projectedInflow,
      projectedOutflow,
      wiseDisplay: country === "brasil" ? bridgeIn : wiseOut || fees,
      wiseLabel: country === "brasil" ? "Recebido no Brasil" : country === "japao" ? "Enviado ao Brasil" : "Taxas no global"
    };
  }

  function monthTransactions(month, country) {
    return state.transactions
      .filter((item) => item.date && item.date.slice(0, 7) === month)
      .filter((item) => country === "global" || item.country === country)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function monthTransfers(month) {
    return state.transfers
      .filter((item) => item.date && item.date.slice(0, 7) === month)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function monthWorkIncomes(month) {
    return (state.workIncomes || [])
      .filter((item) => item.date && item.date.slice(0, 7) === month)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function plannedCommitmentEntries(month, country) {
    return commitmentCalendarEntries(month, country)
      .filter((item) => !item.paid)
      .map((item) => ({
        ...item,
        generated: true,
        icon: typeMeta[item.type]?.icon || "-"
      }));
  }

  function commitmentCalendarEntries(month, country) {
    return (state.commitments || [])
      .filter((item) => item.active !== false)
      .filter((item) => country === "global" || item.country === country)
      .filter((item) => isCommitmentDueInMonth(item, month))
      .map((item) => {
        const paid = isCommitmentPaid(item.id, month);
        const dueDate = dateInMonth(month, item.dueDay || 1);
        const dueState = dueStateForDate(dueDate, paid);
        return {
          id: item.id,
          country: item.country,
          type: item.type,
          title: item.title,
          category: item.category,
          amount: number(item.amount),
          currency: item.currency,
          date: dueDate,
          paid,
          status: dueState.label,
          tone: paid ? "green" : dueState.tone,
          meta: `${countryMeta[item.country]?.label || ""} - ${commitmentFrequencyLabel(item)} - ${item.provider || item.category || "conta fixa"}`,
          kind: item.type === "income" ? "income" : "expense"
        };
      });
  }

  function isCommitmentDueInMonth(item, month) {
    const frequency = item.frequency || "monthly";
    const startMonth = item.startMonth || "";
    const endMonth = item.endMonth || "";
    if (startMonth && month < startMonth) return false;
    if (endMonth && month > endMonth) return false;
    if (frequency === "once") return startMonth ? month === startMonth : true;
    if (frequency === "yearly") {
      const dueMonth = (startMonth || month).slice(5, 7);
      return month.slice(5, 7) === dueMonth;
    }
    return true;
  }

  function commitmentFrequencyLabel(item) {
    const frequency = item.frequency || "monthly";
    if (frequency === "once") return "uma vez";
    if (frequency === "yearly") return "anual";
    return "mensal";
  }

  function plannedCardBillEntries(month, country) {
    return cardBillCalendarEntries(month, country).filter((item) => !item.paid && item.amount > 0);
  }

  function cardBillCalendarEntries(month, country) {
    return (state.creditCards || [])
      .filter((card) => country === "global" || card.country === country)
      .map((card) => {
        const bill = creditCardMonthBill(card, month);
        const paid = isCardBillPaid(card.id, month);
        const dueDate = dateInMonth(month, card.dueDay || 1);
        const dueState = dueStateForDate(dueDate, paid);
        return {
          id: card.id,
          cardId: card.id,
          country: card.country,
          type: "card",
          title: `Fatura ${card.nickname || card.issuer}`,
          category: "Cartao",
          amount: bill.total,
          currency: card.currency,
          date: dueDate,
          paid,
          status: paid ? "Pago" : bill.total ? dueState.label : "Zerada",
          tone: paid ? "green" : bill.total ? dueState.tone : "blue",
          meta: `${countryMeta[card.country]?.label || ""} - fecha ${card.closingDay || "--"} - ${bill.purchaseCount} compra${bill.purchaseCount === 1 ? "" : "s"}`,
          kind: "expense"
        };
      })
      .filter((item) => item.amount > 0);
  }

  function financialCalendarItems(month, country) {
    const items = [
      ...commitmentCalendarEntries(month, country),
      ...cardBillCalendarEntries(month, country),
      ...vehicleCalendarEntries(month, country),
      ...incomeCalendarEntries(month, country),
      ...wiseCalendarEntries(month, country)
    ];
    return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }

  function vehicleCalendarEntries(month, country) {
    if (country !== "global" && country !== "japao") return [];
    return vehicleMonthlyCosts(month).map((item) => ({
      id: item.id,
      country: "japao",
      type: "vehicle",
      title: item.title,
      category: "Veiculo",
      amount: number(item.amount),
      currency: item.currency || "JPY",
      date: item.date,
      status: "Veiculo",
      tone: "blue",
      meta: item.note || "custo do veiculo",
      kind: "expense"
    }));
  }

  function incomeCalendarEntries(month, country) {
    if (country !== "global" && country !== "japao") return [];
    return monthWorkIncomes(month).map((item) => {
      const source = incomeSourceById(item.sourceId);
      return {
        id: item.id,
        country: "japao",
        type: "income",
        title: source.name,
        category: incomeSourceTypeMeta[source.type] || "Renda",
        amount: number(item.amount),
        currency: item.currency || source.currency || "JPY",
        date: item.date,
        status: "Entrada",
        tone: "green",
        meta: workIncomeMeta(item),
        kind: "income"
      };
    });
  }

  function wiseCalendarEntries(month, country) {
    return monthTransfers(month).map((item) => {
      if (country === "brasil") {
        return {
          id: item.id,
          country: "brasil",
          type: "income",
          title: "Wise recebido",
          category: "Wise",
          amount: number(item.receivedAmount),
          currency: "BRL",
          date: item.date,
          status: "Ponte",
          tone: "green",
          meta: `cotacao ${formatRate(item.rate)}`,
          kind: "income"
        };
      }
      return {
        id: item.id,
        country: "japao",
        type: "expense",
        title: "Wise para Brasil",
        category: "Wise",
        amount: number(item.sentAmount),
        currency: "JPY",
        date: item.date,
        status: "Ponte",
        tone: "blue",
        meta: `recebido ${formatMoney(item.receivedAmount, "BRL")}`,
        kind: "expense"
      };
    });
  }

  function creditCardById(id) {
    return (state.creditCards || []).find((card) => card.id === id);
  }

  function creditCardMonthBill(card, month) {
    const rows = cardPurchaseRowsForCard(card.id, month);
    const rate = latestRate(month);
    const purchaseTotal = rows.reduce((total, row) => total + convert(row.rawAmount, row.rawCurrency, card.currency, rate), 0);
    const manual = manualCardBill(card, month);
    return {
      total: round(purchaseTotal + manual, card.currency === "JPY" ? 0 : 2),
      manual,
      purchasesTotal: round(purchaseTotal, card.currency === "JPY" ? 0 : 2),
      purchaseCount: rows.length,
      rows
    };
  }

  function manualCardBill(card, month) {
    const amount = number(card.billAmount);
    if (!amount) return 0;
    if (card.billMonth) return card.billMonth === month ? amount : 0;
    return month === state.ui.selectedMonth ? amount : 0;
  }

  function cardPurchaseRows(month, country) {
    return (state.cardPurchases || [])
      .flatMap((purchase) => {
        const card = creditCardById(purchase.cardId);
        if (!card) return [];
        if (country !== "global" && card.country !== country) return [];
        return cardPurchaseInstallmentRow(purchase, card, month);
      })
      .filter(Boolean)
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  }

  function cardPurchaseRowsForCard(cardId, month) {
    return (state.cardPurchases || [])
      .filter((purchase) => purchase.cardId === cardId)
      .map((purchase) => {
        const card = creditCardById(cardId);
        return card ? cardPurchaseInstallmentRow(purchase, card, month) : null;
      })
      .filter(Boolean);
  }

  function cardPurchaseInstallmentRow(purchase, card, month) {
    const installments = clamp(Math.round(number(purchase.installments)), 1, 60);
    const firstMonth = purchase.firstBillMonth || (purchase.purchaseDate ? purchase.purchaseDate.slice(0, 7) : month);
    const index = monthDiff(firstMonth, month);
    if (index < 0 || index >= installments) return null;
    const rawAmount = installmentAmount(purchase.totalAmount, installments, index);
    return {
      id: purchase.id,
      cardId: card.id,
      cardName: card.nickname || card.issuer,
      country: card.country,
      title: purchase.title,
      category: purchase.category,
      purchaseDate: purchase.purchaseDate || dateInMonth(firstMonth, 1),
      installment: index + 1,
      installments,
      rawAmount,
      rawCurrency: purchase.currency || card.currency,
      amount: convert(rawAmount, purchase.currency || card.currency, card.currency, latestRate(month)),
      currency: card.currency
    };
  }

  function installmentAmount(totalAmount, installments, index) {
    const total = number(totalAmount);
    const base = round(total / installments, 2);
    if (index === installments - 1) return round(total - base * (installments - 1), 2);
    return base;
  }

  function monthDiff(startMonth, endMonth) {
    const [startYear, startIndex] = startMonth.split("-").map(Number);
    const [endYear, endIndex] = endMonth.split("-").map(Number);
    return (endYear - startYear) * 12 + (endIndex - startIndex);
  }

  function incomeSourceById(id) {
    return (state.incomeSources || []).find((source) => source.id === id) || {
      id: "",
      name: "Renda",
      type: "extra",
      color: "#42a67a",
      currency: "JPY",
      hourlyRate: 0
    };
  }

  function workIncomeMeta(item) {
    const parts = [];
    if (item.workDays) parts.push(`${item.workDays} dias`);
    if (item.hirukinDays) parts.push(`${item.hirukinDays} hirukin`);
    if (item.yakinDays) parts.push(`${item.yakinDays} yakin`);
    if (item.weekendDays) parts.push(`${item.weekendDays} fim semana`);
    if (item.periodStart && item.periodEnd) parts.push(`${formatShortDate(item.periodStart)}-${formatShortDate(item.periodEnd)}`);
    return parts.join(" - ") || item.note || "recebimento";
  }

  function vehicleMonthlyCosts(month) {
    const vehicle = state.vehicle || {};
    const items = [];
    const insuranceAmount = number(vehicle.insuranceAmount);
    const shakenAmount = number(vehicle.shakenAmount);

    if (insuranceAmount) {
      items.push({
        id: "vehicle-insurance",
        generated: true,
        country: "japao",
        type: "vehicle",
        title: `Seguro ${vehicle.insuranceCompany || "veiculo"}`,
        category: "Veiculo",
        amount: insuranceAmount,
        currency: "JPY",
        date: dateInMonth(month, vehicle.insuranceDay || 1),
        note: vehicle.insurancePaymentMethod || "seguro mensal",
        icon: "V"
      });
    }

    if (shakenAmount && vehicle.shakenDueDate && vehicle.shakenDueDate.slice(0, 7) === month) {
      items.push({
        id: "vehicle-shaken",
        generated: true,
        country: "japao",
        type: "vehicle",
        title: "Shaken",
        category: "Veiculo",
        amount: shakenAmount,
        currency: "JPY",
        date: vehicle.shakenDueDate,
        note: "vencimento shaken",
        icon: "V"
      });
    }

    (state.vehicleMaintenance || [])
      .filter((item) => item.date && item.date.slice(0, 7) === month)
      .forEach((item) => {
        items.push({
          id: item.id,
          generated: true,
          deleteAction: "delete-vehicle-maintenance",
          editModal: "vehicleMaintenance",
          country: "japao",
          type: "vehicle",
          title: item.kind,
          category: "Veiculo",
          amount: number(item.amount),
          currency: item.currency || "JPY",
          date: item.date,
          note: item.location || item.paymentMethod || "manutencao",
          icon: "V"
        });
      });

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }

  function monthLedgerEntries(month, country) {
    const txs = monthTransactions(month, country);
    const vehicle = country === "global" || country === "japao" ? vehicleMonthlyCosts(month) : [];
    const incomes = country === "global" || country === "japao"
      ? monthWorkIncomes(month).map((item) => {
        const source = incomeSourceById(item.sourceId);
        return {
          id: item.id,
          generated: true,
          deleteAction: "delete-work-income",
          editModal: "workIncome",
          country: "japao",
          type: "income",
          title: source.name,
          category: incomeSourceTypeMeta[source.type] || "Renda",
          amount: number(item.amount),
          currency: item.currency || source.currency || "JPY",
          date: item.date,
          note: workIncomeMeta(item),
          color: source.color,
          icon: "+"
        };
      })
      : [];
    return [...txs, ...vehicle, ...incomes].sort((a, b) => b.date.localeCompare(a.date));
  }

  function categoryTotals(month, country) {
    const currency = country === "brasil" ? "BRL" : state.settings.baseCurrency || "JPY";
    const rate = latestRate(month);
    const totals = new Map();
    monthTransactions(month, country).forEach((item) => {
      if (!allOutflowTypes.includes(item.type)) return;
      const key = item.category || typeMeta[item.type]?.label || "Outros";
      const current = totals.get(key) || 0;
      totals.set(key, current + convert(item.amount, item.currency, currency, rate));
    });
    plannedCommitmentEntries(month, country).forEach((item) => {
      if (!allOutflowTypes.includes(item.type)) return;
      const key = item.category || typeMeta[item.type]?.label || "Outros";
      const current = totals.get(key) || 0;
      totals.set(key, current + convert(item.amount, item.currency, currency, rate));
    });
    plannedCardBillEntries(month, country).forEach((item) => {
      const current = totals.get("Cartao") || 0;
      totals.set("Cartao", current + convert(item.amount, item.currency, currency, rate));
    });
    if (country === "global" || country === "japao") {
      vehicleMonthlyCosts(month).forEach((item) => {
        const current = totals.get("Veiculo") || 0;
        totals.set("Veiculo", current + convert(item.amount, item.currency, currency, rate));
      });
    }
    return Array.from(totals.entries())
      .map(([category, value]) => ({ category, value, currency }))
      .sort((a, b) => b.value - a.value);
  }

  function latestRate(month = state.ui.selectedMonth) {
    const previous = state.transfers
      .filter((item) => item.rate && (!month || item.date.slice(0, 7) <= month))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return previous ? Number(previous.rate) : Number(state.settings.defaultRate || 0.035);
  }

  function latestRateLabel() {
    return `Wise ${formatRate(latestRate())}`;
  }

  function summaryLine(summary) {
    const parts = [
      `Entradas ${formatMoney(summary.income + summary.bridgeIn, summary.currency)}`,
      `saidas ${formatMoney(summary.expenses + summary.investments + summary.wiseOut + summary.fees, summary.currency)}`
    ];
    return parts.join(" · ");
  }

  function inCountryScope(country) {
    return state.ui.activeCountry === "global" || state.ui.activeCountry === country;
  }

  function isCommitmentPaid(id, month) {
    return Boolean(state.paidCommitments[commitmentKey(id, month)]);
  }

  function commitmentKey(id, month) {
    return `${month}:${id}`;
  }

  function isCardBillPaid(id, month) {
    return Boolean(state.paidCommitments[cardBillKey(id, month)]);
  }

  function cardBillKey(id, month) {
    return `${month}:card:${id}`;
  }

  function dueStateForDate(dateValue, paid) {
    if (paid) return { label: "Pago", tone: "green" };
    const today = startOfDay(new Date());
    const due = parseLocalDate(dateValue);
    const diff = Math.round((due - today) / 86400000);
    if (diff < 0) return { label: "Vencido", tone: "red" };
    if (diff === 0) return { label: "Vence hoje", tone: "gold" };
    if (diff <= 3) return { label: `Vence em ${diff} dias`, tone: "gold" };
    return { label: "Aberto", tone: "blue" };
  }

  function convert(amount, from, to, rate) {
    const value = Number(amount || 0);
    if (from === to) return value;
    if (from === "BRL" && to === "JPY") return value / rate;
    if (from === "JPY" && to === "BRL") return value * rate;
    return value;
  }

  function formatMoney(value, currency) {
    const amount = Number(value || 0);
    const locale = currency === "JPY" ? "ja-JP" : "pt-BR";
    const fraction = currency === "JPY" ? 0 : 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: fraction,
      minimumFractionDigits: fraction
    }).format(amount);
  }

  function formatSignedMoney(value, currency) {
    const amount = Number(value || 0);
    const sign = amount >= 0 ? "+" : "-";
    return `${sign} ${formatMoney(Math.abs(amount), currency)}`;
  }

  function formatCryptoAmount(value) {
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 8,
      minimumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function formatCompact(value, currency) {
    const amount = Number(value || 0);
    const locale = currency === "JPY" ? "ja-JP" : "pt-BR";
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: currency === "JPY" ? 0 : 1
    }).format(amount);
  }

  function formatRate(value) {
    return `R$ ${Number(value || 0).toFixed(4)} / ¥1`;
  }

  function formatFxRate(value, decimals) {
    return `R$ ${Number(value || 0).toFixed(decimals)}`;
  }

  function formatYenRate(value) {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function formatUsdRate(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function formatMonthLabel(month) {
    const [year, monthIndex] = month.split("-").map(Number);
    const date = new Date(year, monthIndex - 1, 1);
    const text = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function shortMonthLabel(month) {
    const [year, monthIndex] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(year, monthIndex - 1, 1)).replace(".", "");
  }

  function formatShortDate(date) {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(year, month - 1, day));
  }

  function formatCalendarDay(date) {
    const day = parseLocalDate(date).getDate();
    return String(day).padStart(2, "0");
  }

  function formatCalendarWeekday(date) {
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
      .format(parseLocalDate(date))
      .replace(".", "");
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--:--";
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function addMonths(month, delta) {
    const [year, monthIndex] = month.split("-").map(Number);
    const date = new Date(year, monthIndex - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function recentMonthsFrom(month, count) {
    const months = [];
    for (let index = count - 1; index >= 0; index -= 1) {
      months.push(addMonths(month, -index));
    }
    return months;
  }

  function dateInMonth(month, day) {
    const [year, monthIndex] = month.split("-").map(Number);
    const last = new Date(year, monthIndex, 0).getDate();
    const safeDay = clamp(Number(day) || 1, 1, last);
    return `${month}-${String(safeDay).padStart(2, "0")}`;
  }

  function remainingDaysInMonth(month) {
    const [year, monthIndex] = month.split("-").map(Number);
    const last = new Date(year, monthIndex, 0).getDate();
    const today = new Date();
    const current = currentMonth();
    if (month < current) return 0;
    if (month > current) return last;
    return Math.max(1, last - today.getDate() + 1);
  }

  function parseLocalDate(date) {
    const [year, month, day] = String(date || currentMonth()).split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function normalizeInviteCode(value) {
    return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
  }

  function editableItem(type, id) {
    if (!id) return null;
    const map = {
      transaction: "transactions",
      transfer: "transfers",
      commitment: "commitments",
      debt: "debts",
      investment: "investments",
      creditCard: "creditCards",
      cardPurchase: "cardPurchases",
      crypto: "cryptoAssets",
      vehicleMaintenance: "vehicleMaintenance",
      incomeSource: "incomeSources",
      workIncome: "workIncomes"
    };
    return findItem(map[type], id);
  }

  function editHidden(item) {
    return item?.id ? `<input type="hidden" name="id" value="${escapeAttr(item.id)}" />` : "";
  }

  function selectedAttr(value, selected) {
    return String(value || "") === String(selected || "") ? "selected" : "";
  }

  function findItem(collection, id) {
    if (!collection || !id || !Array.isArray(state[collection])) return null;
    return state[collection].find((item) => item.id === id) || null;
  }

  function upsertItem(collection, id, item, prepend = false) {
    const current = Array.isArray(state[collection]) ? state[collection] : [];
    const index = id ? current.findIndex((entry) => entry.id === id) : -1;
    if (index >= 0) {
      state[collection] = current.map((entry, entryIndex) => (
        entryIndex === index ? { ...entry, ...item, id: entry.id } : entry
      ));
      return true;
    }

    const next = {
      id: id || uid(collectionPrefixes[collection] || "it"),
      ...item
    };
    state[collection] = prepend ? [next, ...current] : [...current, next];
    return false;
  }

  function uid(prefix) {
    if (window.crypto && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }

  function number(value) {
    return Number(String(value || "0").replace(",", "."));
  }

  function sum(items, key) {
    return items.reduce((total, item) => total + Number(item[key] || 0), 0);
  }

  function round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(Number(value || 0) * factor) / factor;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function trimLabel(value, max) {
    const text = String(value || "");
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2300);
  }

  function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }
})();
