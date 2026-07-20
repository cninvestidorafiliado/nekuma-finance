(function () {
  "use strict";

  const STORAGE_KEY = "ponte-financeira-state-v4";
  const REMOTE_HOUSEHOLD_KEY = "ponte-financeira-household-id";
  const LEGACY_STORAGE_KEYS = ["ponte-financeira-state-v1", "ponte-financeira-state-v2"];
  const PRIMARY_CURRENCY = "JPY";
  const DEFAULT_SECONDARY_CURRENCY = "BRL";
  const urlParams = new URLSearchParams(window.location.search);
  const supportedCurrencies = {
    JPY: { label: "JPY - Ienes", locale: "ja-JP", fraction: 0 },
    BRL: { label: "BRL - Real", locale: "pt-BR", fraction: 2 },
    USD: { label: "USD - Dolar", locale: "en-US", fraction: 2 },
    EUR: { label: "EUR - Euro", locale: "de-DE", fraction: 2 }
  };
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
    subscriptions: "su",
    cryptoAssets: "cr",
    housingCards: "hc",
    vehicleMaintenance: "vm",
    incomeSources: "is",
    workIncomes: "wi"
  };
  const housingItemTemplates = [
    { key: "rent", label: "Aluguel", icon: "A" },
    { key: "electricity", label: "Luz", icon: "L" },
    { key: "gas", label: "Gas", icon: "G" },
    { key: "water", label: "Agua", icon: "W" },
    { key: "internet", label: "Internet", icon: "I" }
  ];
  const housingPaymentMethodMeta = {
    bank: "Conta/debito",
    pix: "Pix",
    cash: "Dinheiro",
    card: "Cartao"
  };
  const incomeSourceTypeMeta = {
    factory: "Fabrica",
    salary: "Fabrica",
    amazon: "Amazon",
    uber: "Uber",
    extra: "Renda Extra",
    other: "Outros"
  };
  const commitmentCategoryMeta = {
    imovel: "Imovel",
    veiculo: "Veiculo",
    governo: "Governo",
    estudos: "Estudos",
    diversao: "Diversao",
    investimento: "Investimento",
    other: "Outros"
  };
  const debtProviderOptions = ["Caixa", "Santander", "Bradesco", "Itau", "Banco do Brasil", "Outros"];
  const debtPaymentMethodOptions = ["Debito automatico", "Boleto", "Pix", "Cartao de credito", "Transferencia", "Outro"];
  const subscriptionCatalog = {
    spotify: { name: "Spotify", icon: "SP", color: "#1DB954", asset: "spotify.png" },
    youtube: { name: "YouTube", icon: "YT", color: "#FF0033", asset: "youtube.png" },
    netflix: { name: "Netflix", icon: "N", color: "#E50914", asset: "netflix.png" },
    prime: { name: "Amazon Prime", icon: "A", color: "#00A8E1", asset: "amazon-prime.png" },
    amazonMusic: { name: "Amazon Music", icon: "AM", color: "#00A8E1", asset: "amazon-music-dark.png" },
    disney: { name: "Disney+", icon: "D+", color: "#2B58C8", asset: "disney-plus.png" },
    apple: { name: "Apple", icon: "AP", color: "#111111", asset: "app-store.png" },
    appleMusic: { name: "Apple Music", icon: "AM", color: "#FA2D48", asset: "apple-music.png" },
    appleTv: { name: "Apple TV+", icon: "TV", color: "#111111", asset: "apple-tv.png" },
    icloud: { name: "iCloud", icon: "IC", color: "#5AC8FA", asset: "icloud.png" },
    google: { name: "Google One", icon: "G", color: "#4285F4", asset: "google-one.png" },
    chatgpt: { name: "ChatGPT", icon: "AI", color: "#10A37F", asset: "chat-gpt.png" },
    canva: { name: "Canva", icon: "CV", color: "#7D2AE8" },
    microsoft: { name: "Microsoft 365", icon: "MS", color: "#F25022", asset: "microsoft-365.png" },
    adobe: { name: "Adobe", icon: "AD", color: "#FA0F00" },
    discord: { name: "Discord", icon: "DC", color: "#5865F2" },
    telegram: { name: "Telegram", icon: "TG", color: "#2AABEE" },
    crunchyroll: { name: "Crunchyroll", icon: "CR", color: "#F47521", asset: "crunchyroll.png" },
    dazn: { name: "DAZN", icon: "DZ", color: "#101820" },
    nintendo: { name: "Nintendo", icon: "NS", color: "#E60012", asset: "nintendo-switch.png" },
    playstation: { name: "PlayStation", icon: "PS", color: "#003791", asset: "playstation-plus.png" },
    xbox: { name: "Xbox Game Pass", icon: "XB", color: "#107C10", asset: "xbox-game-pass.png" },
    hulu: { name: "Hulu", icon: "HU", color: "#1CE783" },
    unext: { name: "U-NEXT", icon: "UN", color: "#171717" },
    nordvpn: { name: "NordVPN", icon: "NV", color: "#4687FF", asset: "nordvpn.png" },
    other: { name: "Outro", icon: "+", color: "#48426D" }
  };
  const subscriptionLogoAliases = [
    ["spotify", "spotify.png"],
    ["youtube premium", "youtube.png"],
    ["youtube", "youtube.png"],
    ["netflix", "netflix.png"],
    ["amazon prime", "amazon-prime.png"],
    ["prime video", "amazon-prime.png"],
    ["amazon music", "amazon-music-dark.png"],
    ["disney", "disney-plus.png"],
    ["apple music", "apple-music.png"],
    ["apple tv", "apple-tv.png"],
    ["icloud", "icloud.png"],
    ["google one", "google-one.png"],
    ["chatgpt", "chat-gpt.png"],
    ["chat gpt", "chat-gpt.png"],
    ["microsoft 365", "microsoft-365.png"],
    ["office 365", "microsoft-365.png"],
    ["crunchyroll", "crunchyroll.png"],
    ["nintendo", "nintendo-switch.png"],
    ["playstation", "playstation-plus.png"],
    ["xbox", "xbox-game-pass.png"],
    ["nordvpn", "nordvpn.png"]
  ];
  const cryptoCatalog = {
    BTC: { id: "bitcoin", name: "Bitcoin", color: "#f7931a", asset: "bitcoin.png" },
    ETH: { id: "ethereum", name: "Ethereum", color: "#627eea", asset: "ethereum.png" },
    SOL: { id: "solana", name: "Solana", color: "#48d1cc", asset: "solana.png" },
    ADA: { id: "cardano", name: "Cardano", color: "#d6e85d" },
    XRP: { id: "ripple", name: "XRP", color: "#9aa0a6", asset: "xrp.png" },
    USDT: { id: "tether", name: "Tether", color: "#26a17b", asset: "tether.png" },
    USDC: { id: "usd-coin", name: "USDC", color: "#2775ca", asset: "usdc.png" },
    BNB: { id: "binancecoin", name: "BNB", color: "#f3ba2f", asset: "binance.png" },
    DOGE: { id: "dogecoin", name: "Dogecoin", color: "#c2a633" },
    DOT: { id: "polkadot", name: "Polkadot", color: "#e6007a" },
    AVAX: { id: "avalanche-2", name: "Avalanche", color: "#e84142", asset: "avalanche.png" },
    LINK: { id: "chainlink", name: "Chainlink", color: "#2a5ada" },
    LTC: { id: "litecoin", name: "Litecoin", color: "#345d9d" },
    MATIC: { id: "matic-network", name: "Polygon", color: "#8247e5", asset: "polygon.png" },
    POL: { id: "polygon-ecosystem-token", name: "Polygon", color: "#8247e5", asset: "polygon.png" },
    SHIB: { id: "shiba-inu", name: "Shiba Inu", color: "#f00500", asset: "shiba-inu.png" },
    XMR: { id: "monero", name: "Monero", color: "#ff6600", asset: "monero.png" },
    TRX: { id: "tron", name: "TRON", color: "#ff0013", asset: "trx.png" }
  };
  const web3Networks = {
    "0x1": { name: "Ethereum", symbol: "ETH" },
    "0x38": { name: "BNB Smart Chain", symbol: "BNB" },
    "0x89": { name: "Polygon", symbol: "POL" },
    "0xa": { name: "Optimism", symbol: "ETH" },
    "0xa4b1": { name: "Arbitrum", symbol: "ETH" },
    "0xa86a": { name: "Avalanche", symbol: "AVAX" },
    "0x2105": { name: "Base", symbol: "ETH" },
    "0xaa36a7": { name: "Sepolia", symbol: "ETH" }
  };

  const app = document.getElementById("app");
  const appGreeting = document.getElementById("app-greeting");
  const countryContext = document.getElementById("country-context");
  const modalRoot = document.getElementById("modal-root");
  const toast = document.getElementById("toast");
  let toastTimer = null;
  let cryptoFetchInFlight = false;
  let cryptoRefreshTimer = null;
  let fxFetchInFlight = false;
  let fxRefreshTimer = null;
  let paypalFetchInFlight = false;
  let web3FetchInFlight = false;
  let web3ListenersAttached = false;
  let remotePullTimer = null;
  let remotePullInFlight = false;
  let lastLocalChangeAt = 0;
  cleanupLegacyStorage();
  let state = loadState();
  const remoteStore = createRemoteStore();
  const remoteSession = {
    status: remoteStore.enabled ? "loading" : "local",
    user: null,
    householdId: "",
    household: null,
    householdMembers: [],
    membersError: "",
    error: "",
    lastSyncedAt: null,
    saving: false
  };
  let remoteSaveTimer = null;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js?v=61")
        .then((registration) => registration.update().catch(() => {}))
        .catch(() => {});
    });
  }

  initApp();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && hasPendingLocalChanges()) flushRemoteState().catch(() => {});
    if (document.visibilityState === "visible") requestRemotePull("visible");
  });

  window.addEventListener("focus", () => requestRemotePull("focus"));
  window.addEventListener("online", () => requestRemotePull("online"));
  window.addEventListener("pagehide", () => {
    if (hasPendingLocalChanges()) flushRemoteState().catch(() => {});
  });

  document.addEventListener("click", (event) => {
    if (event.target.classList && event.target.classList.contains("modal-backdrop")) {
      closeModal();
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
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

    if (action === "card-carousel-prev" || action === "card-carousel-next") {
      moveCardCarousel(action === "card-carousel-next" ? 1 : -1, Number(button.dataset.total || 0));
    }

    if (action === "card-carousel-select") {
      selectCardCarousel(Number(button.dataset.index || 0), Number(button.dataset.total || 0));
    }

    if (action === "open-modal") openModal(button.dataset.modal, button.dataset.id);
    if (action === "close-modal") closeModal();
    if (action === "pay-commitment") payCommitment(button.dataset.id);
    if (action === "pay-housing-item") payHousingItem(button.dataset.id, button.dataset.itemKey);
    if (action === "pay-card-bill") payCardBill(button.dataset.id);
    if (action === "delete-transaction") deleteItem("transactions", button.dataset.id, "Lancamento removido.");
    if (action === "delete-transfer") deleteItem("transfers", button.dataset.id, "Transferencia removida.");
    if (action === "delete-commitment") deleteItem("commitments", button.dataset.id, "Conta removida.");
    if (action === "delete-debt") deleteItem("debts", button.dataset.id, "Contrato removido.");
    if (action === "delete-investment") deleteItem("investments", button.dataset.id, "Investimento removido.");
    if (action === "delete-credit-card") deleteItem("creditCards", button.dataset.id, "Cartao removido.");
    if (action === "delete-card-purchase") deleteItem("cardPurchases", button.dataset.id, "Compra removida.");
    if (action === "delete-subscription") deleteItem("subscriptions", button.dataset.id, "Subscricao removida.");
    if (action === "delete-crypto") deleteItem("cryptoAssets", button.dataset.id, "Cripto removida.");
    if (action === "delete-housing-card") deleteItem("housingCards", button.dataset.id, "Moradia removida.");
    if (action === "delete-vehicle-maintenance") deleteItem("vehicleMaintenance", button.dataset.id, "Manutencao removida.");
    if (action === "delete-income-source") deleteItem("incomeSources", button.dataset.id, "Empresa removida.");
    if (action === "delete-work-income") deleteItem("workIncomes", button.dataset.id, "Recebimento removido.");
    if (action === "refresh-crypto") refreshCryptoQuotes(true);
    if (action === "refresh-fx") refreshFxQuotes(true);
    if (action === "refresh-paypal") refreshPaypalBalance(true);
    if (action === "connect-web3") connectWeb3Wallet();
    if (action === "refresh-web3") refreshWeb3Wallet();
    if (action === "disconnect-web3") disconnectWeb3Wallet();
    if (action === "remote-signout") signOutRemote();
    if (action === "remote-sync-now") syncRemoteNow();
    if (action === "reload-app") window.location.reload();
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
    if (formType === "subscription") saveSubscription(form);
    if (formType === "crypto") saveCryptoAsset(form);
    if (formType === "housing-card") saveHousingCard(form);
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
    if (event.target.id === "sourceType") updateIncomeSourceOtherField();
    if (event.target.id === "incomeSourceId") updateWorkIncomeCurrencyField();
    if (event.target.id === "commitmentCategory") updateCommitmentCategoryField();
    if (event.target.id === "commitmentType") updateCommitmentProviderField();
    if (event.target.id === "subscriptionPaymentMethod") updateSubscriptionCardField();
    if (event.target.id === "subscriptionServiceKey") updateSubscriptionCustomField();
    if (event.target.id === "vehicleInsurancePaymentType") updateVehicleInsuranceCardField();
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
    setupWeb3Listeners();
    persistLocalState();
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
      startRemoteAutoSync();
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
      startRemoteAutoSync();
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
      startRemoteAutoSync();
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
    if (hasPendingLocalChanges()) await flushRemoteState();
    await remoteStore.client.auth.signOut();
    remoteSession.status = "signedOut";
    remoteSession.user = null;
    remoteSession.householdId = "";
    remoteSession.household = null;
    remoteSession.householdMembers = [];
    remoteSession.membersError = "";
    remoteSession.error = "";
    stopRemoteAutoSync();
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
      if (remoteSession.householdId && hasPendingLocalChanges()) await flushRemoteState();
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
    await loadRemoteHouseholdMembers(household.id);

    const { data, error } = await remoteStore.client
      .from("app_states")
      .select("state,updated_at")
      .eq("household_id", householdId)
      .maybeSingle();
    if (error) throw error;

    let shouldRewriteRemoteState = false;
    if (data?.state && Object.keys(data.state).length) {
      const remoteState = normalizeState(data.state);
      const mergedCrypto = mergeCryptoAssetsWithLocal(remoteState.cryptoAssets, state.cryptoAssets);
      shouldRewriteRemoteState = cryptoAssetsWereNormalized(data.state.cryptoAssets, remoteState.cryptoAssets) || mergedCrypto.changed;
      state = { ...remoteState, cryptoAssets: mergedCrypto.items };
    } else if (!createIfEmpty) {
      state = createInitialState();
    }
    state.settings.dataMode = "online";
    if (remoteSession.household?.name) state.settings.familyName = remoteSession.household.name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    remoteSession.lastSyncedAt = data?.updated_at || null;
    if (shouldRewriteRemoteState) await flushRemoteState();
    if ((!data?.state || !Object.keys(data.state).length) && createIfEmpty) await flushRemoteState();
  }

  async function loadRemoteHouseholdMembers(householdId = remoteSession.householdId) {
    remoteSession.membersError = "";
    remoteSession.householdMembers = [];
    if (!remoteStore.enabled || !householdId) return;

    try {
      const rpc = await remoteStore.client.rpc("list_household_members", {
        target_household_id: householdId
      });
      if (!rpc.error && Array.isArray(rpc.data)) {
        remoteSession.householdMembers = normalizeRemoteMembers(rpc.data);
        return;
      }

      const fallback = await remoteStore.client
        .from("household_members")
        .select("household_id,user_id,role,created_at")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });
      if (fallback.error) throw fallback.error;
      remoteSession.householdMembers = normalizeRemoteMembers(fallback.data || []);
      if (rpc.error) remoteSession.membersError = "Aplique o SQL de membros para mostrar email e nome.";
    } catch (error) {
      remoteSession.membersError = error.message || "Nao foi possivel carregar membros.";
      remoteSession.householdMembers = fallbackCurrentMember();
    }
  }

  function normalizeRemoteMembers(items) {
    const currentUserId = remoteSession.user?.id || "";
    const currentEmail = remoteSession.user?.email || "";
    return (items || []).map((item) => {
      const userId = item.user_id || item.userId || item.id || "";
      const isCurrentUser = Boolean(item.is_current_user || userId === currentUserId);
      const email = item.email || (isCurrentUser ? currentEmail : "");
      const displayName = item.display_name || item.displayName || item.name || email || (isCurrentUser ? "Voce" : `Membro ${String(userId).slice(0, 8)}`);
      return {
        userId,
        email,
        displayName,
        role: item.role || "member",
        joinedAt: item.joined_at || item.created_at || item.createdAt || "",
        isCurrentUser
      };
    });
  }

  function fallbackCurrentMember() {
    if (!remoteSession.user) return [];
    return [{
      userId: remoteSession.user.id,
      email: remoteSession.user.email || "",
      displayName: remoteSession.user.email || "Voce",
      role: "member",
      joinedAt: "",
      isCurrentUser: true
    }];
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
      remoteSaveTimer = null;
      flushRemoteState().catch((error) => {
        remoteSession.error = error.message || "Falha ao sincronizar.";
        render();
      });
    }, 650);
  }

  async function flushRemoteState() {
    if (!remoteStore.enabled || !remoteSession.user || !remoteSession.householdId) return;
    clearTimeout(remoteSaveTimer);
    remoteSaveTimer = null;
    remoteSession.saving = true;
    const now = new Date().toISOString();
    const nextState = { ...state, settings: { ...state.settings, dataMode: "online" } };

    try {
      const { data, error } = await remoteStore.client.rpc("save_app_state", {
        target_household_id: remoteSession.householdId,
        app_state: nextState
      });

      if (error) {
        const rpcMissing = error.code === "PGRST202" || /save_app_state/i.test(error.message || "");
        if (!rpcMissing) throw error;

        const fallback = await remoteStore.client
          .from("app_states")
          .upsert({
            household_id: remoteSession.householdId,
            state: nextState,
            updated_by: remoteSession.user.id,
            updated_at: now
          }, { onConflict: "household_id" });
        if (fallback.error) throw fallback.error;
        remoteSession.lastSyncedAt = now;
        return;
      }

      remoteSession.lastSyncedAt = data || now;
    } finally {
      remoteSession.saving = false;
    }
  }

  async function syncRemoteNow() {
    try {
      if (hasPendingLocalChanges()) {
        await flushRemoteState();
      } else if (remoteSession.householdId) {
        await loadRemoteStateForHousehold(remoteSession.householdId, false);
      }
      await loadRemoteHouseholdMembers();
      render();
      showToast("Sincronizado.");
    } catch (error) {
      remoteSession.error = error.message || "Falha ao sincronizar.";
      render();
    }
  }

  function startRemoteAutoSync() {
    stopRemoteAutoSync();
    if (!remoteStore.enabled) return;
    remotePullTimer = setInterval(() => requestRemotePull("timer"), 30000);
  }

  function stopRemoteAutoSync() {
    if (remotePullTimer) clearInterval(remotePullTimer);
    remotePullTimer = null;
  }

  function requestRemotePull(reason = "auto") {
    if (!remoteStore.enabled || remoteSession.status !== "ready" || !remoteSession.householdId) return;
    if (remoteSession.saving || remoteSaveTimer || Date.now() - lastLocalChangeAt < 2500) return;
    pullRemoteStateIfNewer(reason).catch((error) => {
      remoteSession.error = error.message || "Falha ao puxar dados da nuvem.";
      render();
    });
  }

  function hasPendingLocalChanges() {
    const localSyncedAt = Date.parse(remoteSession.lastSyncedAt || "") || 0;
    return Boolean(remoteStore.enabled && remoteSession.status === "ready" && lastLocalChangeAt && lastLocalChangeAt > localSyncedAt);
  }

  async function pullRemoteStateIfNewer(reason = "auto") {
    if (remotePullInFlight || !remoteStore.enabled || !remoteSession.householdId) return;
    remotePullInFlight = true;
    try {
      const { data, error } = await remoteStore.client
        .from("app_states")
        .select("state,updated_at")
        .eq("household_id", remoteSession.householdId)
        .maybeSingle();
      if (error) throw error;
      if (!data?.state || !Object.keys(data.state).length) return;

      const remoteUpdatedAt = Date.parse(data.updated_at || "") || 0;
      const localSyncedAt = Date.parse(remoteSession.lastSyncedAt || "") || 0;
      if (remoteUpdatedAt && localSyncedAt && remoteUpdatedAt <= localSyncedAt) return;
      if (localSyncedAt && lastLocalChangeAt > localSyncedAt) return;

      const nextState = normalizeState(data.state);
      state = nextState;
      state.settings.dataMode = "online";
      if (remoteSession.household?.name) state.settings.familyName = remoteSession.household.name;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      remoteSession.lastSyncedAt = data.updated_at || new Date().toISOString();
      await loadRemoteHouseholdMembers();
      render();
      if (reason !== "timer") showToast("Dados atualizados da nuvem.");
    } finally {
      remotePullInFlight = false;
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
    const cryptoQuotes = raw.cryptoQuotes || base.cryptoQuotes;
    const settings = { ...base.settings, ...(raw.settings || {}) };
    settings.baseCurrency = sanitizeCurrency(settings.baseCurrency, PRIMARY_CURRENCY);
    settings.secondaryCurrency = sanitizeSecondaryCurrency(settings.secondaryCurrency, settings.baseCurrency);
    const normalized = {
      settings,
      ui: { ...base.ui, ...(raw.ui || {}) },
      transactions: Array.isArray(raw.transactions) ? raw.transactions : base.transactions,
      transfers: Array.isArray(raw.transfers) ? raw.transfers : base.transfers,
      commitments: Array.isArray(raw.commitments) ? raw.commitments : base.commitments,
      debts: Array.isArray(raw.debts) ? raw.debts : base.debts,
      investments: Array.isArray(raw.investments) ? raw.investments : base.investments,
      creditCards: Array.isArray(raw.creditCards) ? raw.creditCards : base.creditCards,
      cardPurchases: Array.isArray(raw.cardPurchases) ? raw.cardPurchases : base.cardPurchases,
      subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : base.subscriptions,
      cryptoAssets: normalizeCryptoAssets(raw.cryptoAssets, base.cryptoAssets, cryptoQuotes, settings.baseCurrency),
      housingCards: normalizeHousingCards(raw.housingCards, settings.baseCurrency),
      cryptoQuotes,
      fxQuotes: raw.fxQuotes || base.fxQuotes,
      paypal: normalizePaypalState(raw.paypal || base.paypal),
      web3Wallet: normalizeWeb3Wallet(raw.web3Wallet || base.web3Wallet),
      vehicle: normalizeVehicle(raw.vehicle, base.vehicle),
      vehicleMaintenance: Array.isArray(raw.vehicleMaintenance) ? raw.vehicleMaintenance : base.vehicleMaintenance,
      incomeSources: Array.isArray(raw.incomeSources) ? raw.incomeSources : base.incomeSources,
      workIncomes: Array.isArray(raw.workIncomes) ? raw.workIncomes : base.workIncomes,
      paidCommitments: raw.paidCommitments || {}
    };
    normalized.ui.activeCountry = "global";
    if (urlParams.get("tab") === "dashboard" || urlParams.get("home") === "1") {
      normalized.ui.activeTab = "dashboard";
    }
    return normalized;
  }

  function normalizeVehicle(rawVehicle, baseVehicle) {
    const vehicle = { ...baseVehicle, ...(rawVehicle || {}) };
    const paymentType = normalizeVehicleInsurancePaymentType(vehicle);
    const parsed = splitVehicleModel(vehicle.model || "");
    return {
      ...vehicle,
      brand: String(vehicle.brand || parsed.brand || "").trim(),
      model: String(vehicle.brand ? vehicle.model || "" : parsed.model || vehicle.model || "").trim(),
      insurancePaymentType: paymentType,
      insuranceCardId: paymentType === "card" ? String(vehicle.insuranceCardId || "") : ""
    };
  }

  function normalizeCryptoSymbol(value) {
    return String(value || "BTC")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16) || "BTC";
  }

  function normalizeCryptoAssets(items, fallback = [], quotes = state?.cryptoQuotes, fallbackCurrency = primaryCurrency()) {
    if (!Array.isArray(items)) return fallback;
    return items.map((item) => ({
      ...item,
      symbol: normalizeCryptoSymbol(item.symbol || "BTC"),
      customName: String(item.customName || "").trim(),
      quantity: normalizeCryptoQuantityText(item, quotes),
      costAmount: number(item.costAmount),
      costCurrency: sanitizeCurrency(item.costCurrency, fallbackCurrency),
      updatedAt: item.updatedAt || item.savedAt || ""
    }));
  }

  function cryptoAssetsWereNormalized(rawItems, normalizedItems) {
    if (!Array.isArray(rawItems) || !Array.isArray(normalizedItems)) return false;
    return normalizedItems.some((item, index) => String(rawItems[index]?.quantity ?? "") !== String(item.quantity ?? ""));
  }

  function normalizeHousingCards(items, fallbackCurrency = PRIMARY_CURRENCY) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const currency = sanitizeCurrency(item.currency, fallbackCurrency);
      return {
        ...item,
        id: item.id || uid("hc"),
        name: String(item.name || "Moradia").trim(),
        country: countryMeta[item.country] ? item.country : "japao",
        currency,
        active: item.active !== false,
        items: normalizeHousingItems(item.items, currency)
      };
    });
  }

  function normalizeHousingItems(items, fallbackCurrency = PRIMARY_CURRENCY) {
    const byKey = new Map((Array.isArray(items) ? items : []).map((item) => [item.key, item]));
    return housingItemTemplates.map((template) => {
      const item = byKey.get(template.key) || {};
      return {
        key: template.key,
        label: item.label || template.label,
        active: item.active !== false,
        amount: number(item.amount),
        currency: sanitizeCurrency(item.currency, fallbackCurrency),
        dueDay: item.dueDay ? clamp(Math.round(number(item.dueDay)), 1, 31) : 1,
        paymentMethod: housingPaymentMethodMeta[item.paymentMethod] ? item.paymentMethod : "bank",
        cardId: item.cardId || ""
      };
    });
  }

  function normalizePaypalState(raw = {}) {
    const balances = Array.isArray(raw.balances) ? raw.balances.map(normalizePaypalBalance).filter(Boolean) : [];
    return {
      env: String(raw.env || raw.mode || "sandbox").toLowerCase() === "live" ? "live" : "sandbox",
      balances,
      updatedAt: raw.updatedAt || raw.asOfTime || raw.as_of_time || null,
      status: raw.status || "idle",
      error: String(raw.error || ""),
      notice: String(raw.notice || ""),
      balanceUnavailable: Boolean(raw.balanceUnavailable || raw.balance_unavailable),
      source: raw.source || "PayPal"
    };
  }

  function normalizePaypalBalance(item) {
    if (!item) return null;
    const currency = sanitizeCurrency(
      item.currency || item.currency_code || item.total_balance?.currency_code || item.available_balance?.currency_code,
      "USD"
    );
    const total = number(item.total ?? item.total_balance?.value ?? item.total_balance?.amount ?? 0);
    const available = number(item.available ?? item.available_balance?.value ?? item.available_balance?.amount ?? total);
    const withheld = number(item.withheld ?? item.withheld_balance?.value ?? item.withheld_balance?.amount ?? 0);
    return {
      currency,
      total,
      available,
      withheld,
      primary: Boolean(item.primary)
    };
  }

  function paypalBalanceTotal(currency = primaryCurrency(), balances = state.paypal?.balances || []) {
    const rate = latestRate(state.ui.selectedMonth);
    return (balances || []).reduce((total, item) => {
      return total + convert(number(item.total), item.currency, currency, rate);
    }, 0);
  }

  function paypalStatusText(paypal = state.paypal) {
    if (paypal.status === "loading") {
      return { label: "Atualizando saldo", detail: "Consultando a API do PayPal." };
    }
    if (paypal.status === "error") {
      return { label: "Nao conectado", detail: paypal.error || "Configure as variaveis do PayPal no Cloudflare." };
    }
    if (paypal.balanceUnavailable || paypal.status === "limited") {
      return { label: "Live conectado", detail: paypal.notice || "A conta autenticou, mas a API de saldo nao retornou dados para este PayPal." };
    }
    if (!paypal.updatedAt) {
      return { label: "Conectar PayPal", detail: "Configure o endpoint seguro e clique em atualizar." };
    }
    if (!paypal.balances?.length) {
      return { label: "Sem saldo retornado", detail: "O PayPal respondeu sem moedas disponiveis nesta consulta." };
    }
    return { label: "Saldo atualizado", detail: "Dados recebidos da API do PayPal." };
  }

  function normalizeWeb3Wallet(raw = {}) {
    const chainId = String(raw.chainId || "").toLowerCase();
    const meta = web3NetworkMeta(chainId);
    const address = String(raw.address || "").trim();
    return {
      address,
      chainId,
      networkName: String(raw.networkName || meta.name || (chainId ? `Rede ${chainId}` : "")).trim(),
      symbol: String(raw.symbol || meta.symbol || "ETH").trim().toUpperCase(),
      balance: number(raw.balance),
      updatedAt: raw.updatedAt || null,
      status: raw.status || (address ? "connected" : "idle"),
      error: String(raw.error || "")
    };
  }

  function mergeCryptoAssetsWithLocal(remoteItems, localItems) {
    const localById = new Map((localItems || []).map((item) => [item.id, item]));
    let changed = false;
    const merged = (remoteItems || []).map((remoteItem) => {
      const localItem = localById.get(remoteItem.id);
      if (shouldPreferLocalCryptoAsset(remoteItem, localItem)) {
        changed = true;
        return { ...remoteItem, ...localItem, quantity: normalizeCryptoQuantityText(localItem) };
      }
      return remoteItem;
    });

    (localItems || []).forEach((localItem) => {
      if (localItem?.id && !merged.some((item) => item.id === localItem.id)) {
        changed = true;
        merged.push({ ...localItem, quantity: normalizeCryptoQuantityText(localItem) });
      }
    });

    return { items: merged, changed };
  }

  function shouldPreferLocalCryptoAsset(remoteItem, localItem) {
    if (!remoteItem || !localItem) return false;
    const remoteTime = Date.parse(remoteItem.updatedAt || remoteItem.savedAt || "") || 0;
    const localTime = Date.parse(localItem.updatedAt || localItem.savedAt || "") || 0;
    if (localTime && localTime >= remoteTime) return true;
    const remoteQuantity = cryptoQuantityNumber(remoteItem.quantity);
    const localQuantity = cryptoQuantityNumber(localItem.quantity);
    return localQuantity > 0 && localQuantity < 1 && remoteQuantity >= 1;
  }

  function saveState(options = {}) {
    lastLocalChangeAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (options.remoteNow) {
      flushRemoteState().catch((error) => {
        remoteSession.error = error.message || "Falha ao sincronizar.";
        render();
      });
      return;
    }
    scheduleRemoteSave();
  }

  function persistLocalState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function createInitialState() {
    const selectedMonth = currentMonth();

    return {
      settings: {
        familyName: "Familia",
        baseCurrency: PRIMARY_CURRENCY,
        secondaryCurrency: DEFAULT_SECONDARY_CURRENCY,
        defaultRate: 0.0352,
        dataMode: "local"
      },
      ui: {
        activeCountry: "global",
        activeTab: "dashboard",
        selectedMonth,
        activeCardIndex: 0
      },
      transactions: [],
      transfers: [],
      commitments: [],
      debts: [],
      investments: [],
      creditCards: [],
      cardPurchases: [],
      subscriptions: [],
      housingCards: [],
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
        usdEur: 0,
        eurBrl: 0,
        eurJpy: 0,
        btcUsd: 0,
        source: "",
        ratesDate: "",
        updatedAt: null,
        status: "idle"
      },
      paypal: {
        env: "sandbox",
        balances: [],
        updatedAt: null,
        status: "idle",
        error: "",
        source: "PayPal"
      },
      web3Wallet: {
        address: "",
        chainId: "",
        networkName: "",
        symbol: "ETH",
        balance: 0,
        updatedAt: null,
        status: "idle",
        error: ""
      },
      vehicle: {
        brand: "",
        model: "",
        plate: "",
        shakenDueDate: "",
        insuranceAmount: 0,
        insuranceDay: "",
        insuranceCompany: "",
        insurancePaymentMethod: "",
        insurancePaymentType: "bank",
        insuranceCardId: "",
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
      refreshIcons();
      return;
    }

    app.innerHTML = state.ui.activeTab === "dashboard"
      ? renderCurrentTab()
      : [
        renderToolbar(),
        renderCurrentTab()
      ].join("");

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.tab === state.ui.activeTab);
    });

    refreshIcons();
    requestAnimationFrame(drawVisibleCharts);
    scheduleFxRefresh(false);
    scheduleCryptoRefresh(false);
  }

  function refreshIcons() {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons({
        attrs: {
          "stroke-width": 2.25
        }
      });
    }
  }

  function updateAppGreeting() {
    const family = remoteSession.household?.name || state.settings.familyName || "familia";
    if (appGreeting) {
      appGreeting.textContent = remoteStore.enabled && remoteSession.status !== "ready"
        ? "Nekuma Finance"
        : `Hey, ${family}`;
    }
    if (countryContext) countryContext.textContent = countryContextLabel();
  }

  function countryContextLabel() {
    if (remoteStore.enabled && remoteSession.status !== "ready") return "Acesso seguro";
    return `Global em ${primaryCurrency()}`;
  }

  function renderAuthGate() {
    const isLoading = remoteSession.status === "loading";
    const canSignup = remoteStore.config.enableSignup !== false;
    return `
      <section class="auth-panel">
        <article class="auth-visual" aria-hidden="true">
          <img class="auth-brand-mark" src="./assets/nekuma-logo-192.png" alt="" />
          <div>
            <p class="auth-kicker">Nekuma Finance</p>
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
    if (tab === "crypto") return renderCryptoTab();
    if (tab === "wise") return renderWise();
    if (tab === "reports") return renderReports();
    if (tab === "settings") return renderSettings();
    return renderDashboard();
  }

  function renderDashboard() {
    const summary = summarizeMonth(state.ui.selectedMonth, "global");

    return `
      ${renderFxCards()}

      <section class="content-panel overview-card">
        ${renderBalanceOverview(summary)}
      </section>

      <section class="content-panel paypal-panel">
        ${renderPaypalPanel()}
      </section>

      <section class="content-panel subscriptions-panel">
        <div class="panel-head">
          <h2>Subscricoes atuais</h2>
          <button class="small-action icon-action" type="button" data-action="open-modal" data-modal="subscription" aria-label="Nova subscricao">+</button>
        </div>
        ${renderSubscriptionsHomePanel()}
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Calendario financeiro</h2>
          <span class="chip gold">${formatMonthLabel(state.ui.selectedMonth)}</span>
        </div>
        ${renderFinancialCalendar(8, "upcoming")}
      </section>

      <section class="content-panel housing-panel">
        <div class="panel-head">
          <h2>Moradia</h2>
          <button class="small-action" type="button" data-action="open-modal" data-modal="housingCard">Nova moradia</button>
        </div>
        ${renderHousingPanel(2)}
      </section>

      <section class="content-panel crypto-panel is-compact">
        <div class="panel-head">
          <h2>Carteira cripto</h2>
          <div class="chips">
            <button class="small-action ghost" type="button" data-action="refresh-crypto">Atualizar</button>
            <button class="small-action" type="button" data-action="open-modal" data-modal="crypto">Nova cripto</button>
          </div>
        </div>
        ${renderCryptoPanel(true)}
      </section>

      <section class="dashboard-card-vehicle-grid">
        <article class="content-panel dashboard-cards-panel">
          <div class="panel-head">
            <h2>Meus Cartoes</h2>
            <button class="small-action" type="button" data-action="open-modal" data-modal="creditCard">Novo</button>
          </div>
          <div class="desktop-card-stack">${renderCreditCardStackPanel()}</div>
          <div class="mobile-card-list">${renderCreditCardsPanel(3)}</div>
        </article>

        <article class="content-panel vehicle-panel">
          <div class="panel-head">
            <h2>Veiculo Japao</h2>
            <button class="small-action ghost" type="button" data-action="open-modal" data-modal="vehicle">Editar</button>
          </div>
          ${renderVehiclePanel(3)}
        </article>
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Comparativo do mes</h2>
          <span class="chip blue">6 meses</span>
        </div>
        <div class="chart-wrap"><canvas id="trend-chart" aria-label="Grafico mensal"></canvas></div>
      </section>

      <section class="content-panel debt-home-panel">
        <div class="panel-head">
          <h2>Financiamentos</h2>
          <button class="small-action" type="button" data-action="open-modal" data-modal="debt">Novo contrato</button>
        </div>
        ${renderDebtList()}
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Ultimos lancamentos</h2>
          <button class="small-action ghost" type="button" data-action="set-tab" data-tab="accounts">Ver contas</button>
        </div>
          ${renderTransactionList(monthLedgerEntries(state.ui.selectedMonth, "global").slice(0, 7))}
      </section>
    `;
  }

  function renderBalanceOverview(summary) {
    const breakdown = dashboardBalanceBreakdown(summary);
    const payableLabel = breakdown.payables ? formatMoneyWithPrimary(breakdown.payables, breakdown.currency) : formatMoney(0, breakdown.currency);
    return `
      <div class="balance-overview">
        <div class="balance-copy">
          <p class="hero-title">Saldo atual</p>
          <p class="hero-value">${formatMoneyWithPrimary(summary.remaining, summary.currency)}</p>
          <div class="overview-mini-grid">
            <div>
              <span>Recebido ate agora</span>
              <strong>${formatMoneyWithPrimary(breakdown.received, breakdown.currency)}</strong>
            </div>
            <div>
              <span>Contas a pagar</span>
              <strong>${payableLabel}</strong>
            </div>
          </div>
        </div>
        <div class="balance-pie-wrap">
          <canvas id="balance-pie-chart" aria-label="Recebido contra contas a pagar"></canvas>
          <div class="balance-pie-center">
            <span>Folego</span>
            <strong>${summary.coverage}%</strong>
          </div>
        </div>
      </div>
    `;
  }

  function renderPaypalPanel() {
    const paypal = normalizePaypalState(state.paypal);
    const total = paypalBalanceTotal(primaryCurrency(), paypal.balances);
    const status = paypalStatusText(paypal);
    const hasBalances = paypal.balances.length > 0;
    const updated = paypal.updatedAt ? `Atualizado ${formatTime(paypal.updatedAt)}` : "Ainda nao atualizado";
    return `
      <div class="panel-head">
        <div>
          <h2>PayPal</h2>
          <p class="row-meta">Saldo da carteira PayPal via API segura</p>
        </div>
        <div class="chips">
          <span class="chip ${paypal.env === "live" ? "green" : "gold"}">${escapeHtml(paypal.env === "live" ? "Live" : "Sandbox")}</span>
          <button class="small-action ghost" type="button" data-action="refresh-paypal">${paypal.status === "loading" ? "Atualizando" : "Atualizar"}</button>
        </div>
      </div>
      <div class="paypal-card">
        <div class="paypal-total">
          <span>Saldo PayPal</span>
          <strong>${hasBalances ? formatMoneyWithPrimary(total, primaryCurrency()) : "--"}</strong>
          <small>${escapeHtml(updated)}</small>
        </div>
        <div class="paypal-balance-list">
          ${hasBalances ? paypal.balances.slice(0, 4).map((item) => `
            <div class="paypal-balance-row">
              <span>${escapeHtml(item.currency)}</span>
              <strong>${formatMoney(item.total, item.currency)}</strong>
              <small>Disponivel ${formatMoney(item.available, item.currency)}</small>
            </div>
          `).join("") : `
            <div class="paypal-empty">
              <strong>${escapeHtml(status.label)}</strong>
              <small>${escapeHtml(status.detail)}</small>
            </div>
          `}
        </div>
      </div>
      ${paypal.error ? `<p class="row-meta paypal-error">${escapeHtml(paypal.error)}</p>` : paypal.notice ? `<p class="row-meta">${escapeHtml(paypal.notice)}</p>` : `<p class="row-meta">O PayPal pode demorar ate 3 horas para refletir saldo e transacoes recentes.</p>`}
    `;
  }

  function dashboardBalanceBreakdown(summary = summarizeMonth(state.ui.selectedMonth, "global")) {
    const currency = summary.currency;
    const rate = latestRate(state.ui.selectedMonth);
    const payables = dashboardUpcomingFinancialItems(99).reduce((total, item) => {
      return total + convert(item.amount, item.currency, currency, rate);
    }, 0);
    return {
      currency,
      received: Math.max(0, summary.actualInflow),
      payables: Math.max(0, payables)
    };
  }

  function dashboardUpcomingFinancialItems(limit = 8) {
    const selectedMonth = state.ui.selectedMonth;
    const current = currentMonth();
    const today = startOfDay(new Date());
    const minDate = selectedMonth === current ? today : parseLocalDate(dateInMonth(selectedMonth, 1));
    if (selectedMonth < current) return [];
    return financialCalendarItems(selectedMonth, "global")
      .filter((item) => item.kind !== "income")
      .filter((item) => item.amount > 0)
      .filter((item) => !item.paid)
      .filter((item) => parseLocalDate(item.date) >= minDate)
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
      .slice(0, limit);
  }

  function renderAccounts() {
    return `
      <section class="split-grid">
        <article class="content-panel">
          <div class="panel-head">
            <h2>Pagamentos do mes</h2>
            <div class="chips">
              <button class="small-action" type="button" data-action="open-modal" data-modal="workIncome">Recebimento</button>
            </div>
          </div>
          ${renderIncomePaymentsPanel(null)}
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
          ${renderVehicleMaintenancePanel(null)}
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

      </section>

      <section class="content-panel housing-panel">
        <div class="panel-head">
          <h2>Moradia</h2>
          <button class="small-action" type="button" data-action="open-modal" data-modal="housingCard">Nova moradia</button>
        </div>
        ${renderHousingPanel(null)}
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Subscricoes</h2>
          <button class="small-action" type="button" data-action="open-modal" data-modal="subscription">Nova subscricao</button>
        </div>
        ${renderSubscriptionsPanel(null)}
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
    const summary = summarizeMonth(state.ui.selectedMonth, "global");
    const scope = `Global em ${primaryCurrency()}`;

    return `
      <section class="content-panel">
        <div class="panel-head">
          <h2>Relatorios - ${scope}</h2>
          <span class="chip gold">${formatMonthLabel(state.ui.selectedMonth)}</span>
        </div>
        <div class="stat-strip">
          <div class="stat-box">
            <p class="mini-label">Entradas</p>
            <strong>${formatMoneyWithPrimary(summary.income + summary.bridgeIn, summary.currency)}</strong>
          </div>
          <div class="stat-box">
            <p class="mini-label">Saidas</p>
            <strong>${formatMoneyWithPrimary(summary.expenses + summary.investments + summary.wiseOut + summary.fees, summary.currency)}</strong>
          </div>
          <div class="stat-box">
            <p class="mini-label">Investido</p>
            <strong>${formatMoneyWithPrimary(summary.investments, summary.currency)}</strong>
          </div>
          <div class="stat-box">
            <p class="mini-label">Saldo atual</p>
            <strong>${formatMoneyWithPrimary(summary.remaining, summary.currency)}</strong>
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
            <span class="chip gold">${countryMeta.global.short}</span>
          </div>
          <div class="chart-wrap"><canvas id="category-chart" aria-label="Gastos por categoria"></canvas></div>
        </article>
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Brasil x Japao</h2>
          <span class="chip green">Convertido em ${primaryCurrency()}</span>
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
    const fx = currentFxQuoteInfo();
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
              <label for="baseCurrency">Moeda principal</label>
              <select id="baseCurrency" name="baseCurrency">
                ${currencyOptions(primaryCurrency())}
              </select>
              <p class="row-meta">Usada nos saldos, graficos e relatorios.</p>
            </div>
          </div>
          <div class="field">
            <label for="secondaryCurrency">Moeda secundaria</label>
            <select id="secondaryCurrency" name="secondaryCurrency">
              ${currencyOptions(secondaryCurrency())}
            </select>
            <p class="row-meta">Aparece entre parenteses como comparativo. Nao pode ser igual a principal.</p>
          </div>
          <div class="settings-rate-card">
            <div class="panel-head compact">
              <h3>Cotacao automatica</h3>
              <span class="chip ${fx.tone}">${escapeHtml(fx.status)}</span>
            </div>
            <div class="settings-rate-grid">
              <div class="readonly-field">
                <span>Real por iene</span>
                <strong>${fx.jpyBrl ? formatRate(fx.jpyBrl) : "--"}</strong>
              </div>
              <div class="readonly-field">
                <span>Iene por real</span>
                <strong>${fx.brlJpy ? formatYenPerReal(fx.brlJpy) : "--"}</strong>
              </div>
              <div class="readonly-field">
                <span>Real por dolar</span>
                <strong>${fx.usdBrl ? formatUsdPerReal(fx.usdBrl) : "--"}</strong>
              </div>
              <div class="readonly-field">
                <span>Real por euro</span>
                <strong>${fx.eurBrl ? formatEuroPerReal(fx.eurBrl) : "--"}</strong>
              </div>
            </div>
            <p class="row-meta">${escapeHtml(fx.meta)}</p>
            <button class="small-action ghost" type="button" data-action="refresh-fx">Atualizar cotacao</button>
          </div>
          <div class="form-actions">
            <button class="primary-button" type="submit">Salvar ajustes</button>
          </div>
        </form>
      </section>

      <section class="content-panel">
        <div class="panel-head">
          <h2>Empresas e Rendas</h2>
          <button class="small-action" type="button" data-action="open-modal" data-modal="incomeSource">Empresa</button>
        </div>
        ${renderIncomeSourcesSettingsPanel()}
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
          ${renderHouseholdMembers()}
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

  function renderHouseholdMembers() {
    const members = remoteSession.householdMembers || [];
    const rows = members.length ? members : fallbackCurrentMember();
    return `
      <div class="family-members-card">
        <div class="panel-head compact">
          <h3>Usuarios da familia</h3>
          <span class="chip blue">${rows.length}</span>
        </div>
        <div class="family-member-list">
          ${rows.map((member) => `
            <div class="family-member-row">
              <span class="member-avatar">${memberInitials(member)}</span>
              <div>
                <p class="row-title">${escapeHtml(member.displayName || member.email || "Membro")}${member.isCurrentUser ? " (voce)" : ""}</p>
                <p class="row-meta">${escapeHtml(member.email || member.userId || "Usuario vinculado")}</p>
                <p class="row-meta">${member.joinedAt ? `Entrou em ${formatShortDate(member.joinedAt)}` : "Vinculo ativo"}</p>
              </div>
              <span class="chip ${member.role === "owner" ? "gold" : "green"}">${member.role === "owner" ? "Dono" : "Membro"}</span>
            </div>
          `).join("")}
        </div>
        ${remoteSession.membersError ? `<p class="row-meta">${escapeHtml(remoteSession.membersError)}</p>` : ""}
      </div>
    `;
  }

  function renderCommitmentList(limit) {
    const month = state.ui.selectedMonth;
    const commitments = state.commitments
      .filter((item) => item.active !== false)
      .filter((item) => inCountryScope(item.country))
      .filter((item) => isCommitmentDueInMonth(item, month))
      .sort((a, b) => commitmentDateForMonth(a, month).localeCompare(commitmentDateForMonth(b, month)));
    const rows = (limit ? commitments.slice(0, limit) : commitments).map((item) => {
      const paid = isCommitmentPaid(item.id, month);
      const meta = typeMeta[item.type] || typeMeta.expense;
      const dueDate = commitmentDateForMonth(item, month);
      const dueState = dueStateForDate(dueDate, paid);
      const frequency = commitmentFrequencyLabel(item);
      const details = [
        countryMeta[item.country]?.label || "",
        `vence ${formatShortDate(dueDate)}`,
        frequency,
        item.provider || item.category
      ].filter(Boolean).join(" - ");
      return `
        <div class="list-row">
          <span class="row-icon ${paid ? "green" : dueState.tone || meta.tone}">${paid ? "OK" : meta.icon}</span>
          <div class="row-main">
            <p class="row-title">${escapeHtml(item.title)}</p>
            <p class="row-meta">${escapeHtml(details)}</p>
            <p class="row-meta">${dueState.label}${item.alertDays ? ` - alerta ${item.alertDays} dias antes` : ""}</p>
          </div>
            <div class="row-amount">
              ${formatMoneyWithPrimary(item.amount, item.currency, month)}
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

  function renderDebtListLegacy() {
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
                <p class="row-meta">${countryMeta[item.country].label} · ${escapeHtml(item.provider)} · parcela ${formatMoneyWithPrimary(item.installmentAmount, item.currency)}</p>
                <div class="progress-track" aria-hidden="true"><div class="progress-fill" style="width:${progress}%"></div></div>
                <p class="row-meta">${progress}% quitado · saldo ${formatMoneyWithPrimary(item.outstandingAmount, item.currency)}</p>
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

  function renderDebtList() {
    const debts = state.debts.filter((item) => inCountryScope(item.country));
    if (!debts.length) return `<p class="empty-state">Nenhum financiamento cadastrado.</p>`;
    return `
      <div class="debt-list">
        ${debts.map((item) => {
          const progress = debtInstallmentProgress(item);
          const payment = debtNextPaymentAmount(item);
          const outstanding = debtEstimatedOutstanding(item);
          const provider = debtProviderLabel(item);
          const typeLabel = debtTypeLabel(item.type);
          const contract = item.contractLast4 ? `Contrato **** ${escapeHtml(item.contractLast4)}` : "Contrato sem final cadastrado";
          const dueLabel = item.dueDay ? `vence dia ${item.dueDay}` : "vencimento nao informado";
          const paymentLabel = item.paymentMethod ? ` - ${escapeHtml(item.paymentMethod)}` : "";
          return `
            <div class="debt-card">
              <div class="debt-card-head">
                <span class="row-icon blue">F</span>
                <div class="row-main">
                  <div class="debt-title-line">
                    <p class="row-title">${escapeHtml(item.title)}</p>
                    <span class="debt-provider-tag">${escapeHtml(provider)}</span>
                  </div>
                  <p class="row-meta">${countryMeta[item.country]?.label || "Global"} - ${typeLabel} - ${contract}</p>
                </div>
              </div>
              <div class="debt-card-grid">
                <div class="debt-card-stat">
                  <span>Proxima parcela</span>
                  <strong>${formatMoneyWithPrimary(payment, item.currency)}</strong>
                  <small>${dueLabel}${paymentLabel}</small>
                </div>
                <div class="debt-card-stat">
                  <span>Parcelas</span>
                  <strong>${progress.paid}/${progress.total || "--"}</strong>
                  <small>${progress.remaining} faltam</small>
                </div>
                <div class="debt-card-stat">
                  <span>Saldo devedor</span>
                  <strong>${formatMoneyWithPrimary(outstanding, item.currency)}</strong>
                  <small>Calculo aproximado</small>
                </div>
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
              ${formatMoneyWithPrimary(item.currentAmount, item.currency)}
              <p class="row-meta">+ ${formatMoneyWithPrimary(item.monthlyContribution, item.currency)}/mes</p>
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
      <div class="cards-grid ${limit ? "compact" : "with-actions"}">
        ${visible.map((item) => {
          const country = countryMeta[item.country] || countryMeta.japao;
          const bill = creditCardMonthBill(item, state.ui.selectedMonth);
          const paid = isCardBillPaid(item.id, state.ui.selectedMonth);
          const usage = item.limitAmount ? clamp(Math.round((bill.total / item.limitAmount) * 100), 0, 999) : 0;
          return `
            <div class="credit-card-tile ${item.country === "brasil" ? "br-card" : "jp-card"} ${cardVisualStyle(item)}">
              <div class="flag-badge ${item.country === "brasil" ? "br" : "jp"}">${country.short}</div>
              <div class="card-topline">
                <span class="card-chip" aria-hidden="true"></span>
                <span class="card-network-mark">${escapeHtml(cardNetworkLabel(item))}</span>
              </div>
              <div class="card-brand">${escapeHtml(item.issuer || item.brand || "Credito")}</div>
              <p class="card-name">${escapeHtml(item.nickname || item.issuer)}</p>
              <p class="card-number">****  ****  ****  ${escapeHtml(item.last4 || "0000")}</p>
              <div class="card-foot">
                <span>A pagar ${formatMoneyWithPrimary(bill.total, item.currency)}</span>
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

  function renderCreditCardStackPanel() {
    const cards = state.creditCards || [];
    if (!cards.length) {
      return `
        <div class="empty-action card-stack-empty">
          <p class="empty-state">Nenhum cartao cadastrado.</p>
          <button class="small-action" type="button" data-action="open-modal" data-modal="creditCard">Cadastrar cartao</button>
        </div>
      `;
    }

    const total = cards.length;
    const activeIndex = normalizeCardCarouselIndex(total);
    const stackSize = Math.min(total, 3);
    const stackCards = Array.from({ length: stackSize }, (_, offset) => {
      const index = (activeIndex + offset) % total;
      return { card: cards[index], index, offset };
    }).reverse();
    return `
      <div class="card-stack-widget">
        <div class="card-stack-stage" style="--stack-total:${stackSize}">
          ${stackCards.map(({ card, index, offset }) => {
            const bill = creditCardMonthBill(card, state.ui.selectedMonth);
            const country = countryMeta[card.country] || countryMeta.japao;
            const isActive = offset === 0;
            return `
              <button
                class="stack-card ${isActive ? "is-front" : "is-back"} ${card.country === "brasil" ? "br-card" : "jp-card"} ${cardVisualStyle(card)}"
                type="button"
                data-action="card-carousel-select"
                data-index="${index}"
                data-total="${total}"
                style="--stack-y:${58 - offset * 28}px;--stack-x:${offset * 16}px;--stack-scale:${(1 - offset * 0.045).toFixed(3)};--stack-z:${20 - offset};--stack-opacity:${(1 - offset * 0.08).toFixed(2)}"
                aria-label="${isActive ? "Cartao atual" : "Trazer cartao para frente"}"
              >
                <span class="flag-badge ${card.country === "brasil" ? "br" : "jp"}">${country.short}</span>
                <span class="stack-card-network">${escapeHtml(cardNetworkLabel(card))}</span>
                <span class="stack-card-name">${escapeHtml(card.nickname || card.issuer || "Cartao")}</span>
                <span class="stack-card-number">**** ${escapeHtml(card.last4 || "0000")}</span>
                <span class="stack-card-footer">
                  <span>
                    <small>Fatura atual</small>
                    <strong>${formatMoneyWithPrimary(bill.total, card.currency, state.ui.selectedMonth)}</strong>
                  </span>
                  <span>
                    <small>Vence</small>
                    <strong>${card.dueDay ? formatShortDate(dateInMonth(state.ui.selectedMonth, card.dueDay)) : "--"}</strong>
                  </span>
                </span>
              </button>
            `;
          }).join("")}
        </div>
        <div class="card-stack-summary only-total">
          <strong>${formatMoney(cardWalletSummary(cards).total, primaryCurrency())}</strong>
        </div>
      </div>
    `;
  }

  function cardWalletSummary(cards) {
    const currency = primaryCurrency();
    const rate = latestRate(state.ui.selectedMonth);
    const originalTotals = new Map();
    const total = cards.reduce((sumValue, card) => {
      const bill = creditCardMonthBill(card, state.ui.selectedMonth);
      if (bill.total > 0) originalTotals.set(card.currency, (originalTotals.get(card.currency) || 0) + bill.total);
      return sumValue + convert(bill.total, card.currency, currency, rate);
    }, 0);
    const detail = Array.from(originalTotals.entries())
      .filter(([originalCurrency, value]) => originalCurrency !== currency && value > 0)
      .map(([originalCurrency, value]) => `${formatMoney(value, originalCurrency)} (${formatMoney(convert(value, originalCurrency, currency, rate), currency)})`)
      .join(" - ");
    return { total, currency, detail };
  }

  function moveCardCarousel(delta, total) {
    if (total <= 1) return;
    const current = normalizeCardCarouselIndex(total);
    state.ui.activeCardIndex = (current + delta + total) % total;
    saveState();
    render();
  }

  function selectCardCarousel(index, total) {
    if (!total) return;
    state.ui.activeCardIndex = clamp(Math.round(index), 0, total - 1);
    saveState();
    render();
  }

  function normalizeCardCarouselIndex(total) {
    if (!total) return 0;
    return clamp(Math.round(number(state.ui.activeCardIndex)), 0, total - 1);
  }

  function cardCarouselPosition(index, activeIndex, total) {
    if (index === activeIndex || total <= 1) return "is-active";
    if (index === (activeIndex + 1) % total) return "is-next";
    if (total > 2 && index === (activeIndex - 1 + total) % total) return "is-prev";
    return "is-hidden";
  }

  function cardVisualStyle(card) {
    const text = normalizeLookupText(`${card?.issuer || ""} ${card?.nickname || ""} ${card?.brand || ""}`);
    if (text.includes("nubank")) return "style-nubank";
    if (text.includes("santander")) return "style-santander";
    if (text.includes("caixa")) return "style-caixa";
    if (text.includes("wise")) return "style-wise";
    if (text.includes("jcb")) return "style-jcb";
    if (text.includes("amex")) return "style-amex";
    if (text.includes("visa")) return "style-visa";
    if (text.includes("mastercard")) return "style-mastercard";
    return card?.country === "brasil" ? "style-brasil" : "style-japao";
  }

  function cardNetworkLabel(card) {
    const brand = String(card?.brand || "").trim();
    if (!brand) return "Card";
    if (normalizeLookupText(brand).includes("master")) return "Mastercard";
    return brand;
  }

  function renderSubscriptionsPanel(limit) {
    const month = state.ui.selectedMonth;
    const subscriptions = monthSubscriptions(month, "global");
    const visible = limit ? subscriptions.slice(0, limit) : subscriptions;
    const totalCurrency = primaryCurrency();
    const total = subscriptions.reduce((sumValue, item) => {
      return sumValue + convert(item.amount, item.currency, totalCurrency, latestRate(month));
    }, 0);

    if (!subscriptions.length) {
      return `<p class="empty-state">Nenhuma subscricao cadastrada.</p>`;
    }

    return `
      <div class="subscription-summary">
        <p class="mini-label">${subscriptions.length} ativa${subscriptions.length === 1 ? "" : "s"} no mes</p>
        <strong>${formatMoney(total, totalCurrency)}</strong>
      </div>
      ${limit ? `
        <div class="subscription-grid">
          ${visible.map((item) => {
            return `
              <button class="subscription-badge" type="button" data-action="open-modal" data-modal="subscription" data-id="${item.id}">
                ${renderSubscriptionLogo(item, "subscription-logo subscription-icon")}
                <strong>${escapeHtml(subscriptionName(item))}</strong>
                <span class="subscription-value">${formatMoneyWithPrimary(item.amount, item.currency, month)}</span>
              </button>
            `;
          }).join("")}
        </div>
      ` : ""}
      ${limit || !visible.length ? "" : `
        <div class="subscription-list">
          ${visible.map((item) => {
            const card = item.cardId ? creditCardById(item.cardId) : null;
            const payment = item.paymentMethod === "card"
              ? `Cartao ${card ? card.nickname || card.issuer : ""}`.trim()
              : "Pix";
            return `
              <div class="list-row subscription-detail-row">
                ${renderSubscriptionLogo(item, "row-icon subscription-logo subscription-row-icon")}
                <div class="row-main">
                  <p class="row-title">${escapeHtml(subscriptionName(item))}</p>
                  <p class="row-meta">${countryMeta[item.country]?.label || ""} - vence dia ${item.dueDay || "--"} - ${escapeHtml(payment)}</p>
                </div>
                <div class="row-amount expense">
                  ${formatMoneyWithPrimary(item.amount, item.currency, month)}
                  <div class="row-actions">
                    <button class="small-action ghost" type="button" data-action="open-modal" data-modal="subscription" data-id="${item.id}">Editar</button>
                    <button class="small-action ghost" type="button" data-action="delete-subscription" data-id="${item.id}">Excluir</button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `}
    `;
  }

  function renderCryptoTab() {
    return `
      <section class="content-panel web3-panel">
        ${renderWeb3WalletCard()}
      </section>

      <section class="content-panel crypto-panel crypto-page">
        <div class="panel-head">
          <h2>Criptomoedas</h2>
          <div class="chips">
            <button class="small-action ghost" type="button" data-action="refresh-crypto">Atualizar</button>
            <button class="small-action" type="button" data-action="open-modal" data-modal="crypto">Nova cripto</button>
          </div>
        </div>
        ${renderCryptoPanel(false)}
      </section>
    `;
  }

  function renderWeb3WalletCard() {
    const wallet = normalizeWeb3Wallet(state.web3Wallet);
    const connected = Boolean(wallet.address);
    const providerLabel = web3ProviderAvailable() ? "Carteira detectada" : "Carteira nao detectada";
    const updated = wallet.updatedAt ? `Atualizada ${formatTime(wallet.updatedAt)}` : "Ainda nao atualizada";
    return `
      <div class="panel-head">
        <div>
          <h2>Carteira Web3</h2>
          <p class="row-meta">Conecte MetaMask ou carteira EVM para consultar saldo nativo.</p>
        </div>
        <div class="chips">
          <span class="chip ${connected ? "green" : "gold"}">${connected ? "Conectada" : providerLabel}</span>
          ${connected ? `<button class="small-action ghost" type="button" data-action="refresh-web3">${wallet.status === "loading" ? "Atualizando" : "Atualizar"}</button>` : ""}
          <button class="small-action" type="button" data-action="${connected ? "disconnect-web3" : "connect-web3"}">${connected ? "Desconectar" : "Conectar"}</button>
        </div>
      </div>
      <div class="web3-wallet-card ${connected ? "is-connected" : ""}">
        <div class="web3-wallet-orb">W3</div>
        <div class="web3-wallet-main">
          <span class="mini-label">${connected ? escapeHtml(wallet.networkName || "Rede Web3") : "Web3 wallet"}</span>
          <strong>${connected ? escapeHtml(shortAddress(wallet.address)) : "Conecte sua carteira"}</strong>
          <p class="row-meta">${connected ? `${escapeHtml(updated)} - ${escapeHtml(wallet.chainId || "--")}` : "Use o navegador da MetaMask ou uma carteira compatível com Ethereum Provider."}</p>
        </div>
        <div class="web3-wallet-balance">
          <span>Saldo nativo</span>
          <strong>${connected ? `${formatCryptoAmount(wallet.balance)} ${escapeHtml(wallet.symbol)}` : "--"}</strong>
          <small>${connected ? escapeHtml(wallet.networkName || wallet.symbol) : "Somente leitura"}</small>
        </div>
      </div>
      ${wallet.error ? `<p class="row-meta web3-error">${escapeHtml(wallet.error)}</p>` : `<p class="row-meta">O app nunca acessa sua seed phrase ou chave privada. Transacoes futuras sempre exigirao aprovacao na carteira.</p>`}
    `;
  }

  function renderSubscriptionsHomePanel(limit = null) {
    const month = state.ui.selectedMonth;
    const subscriptions = monthSubscriptions(month, "global");
    if (!subscriptions.length) {
      return `<p class="empty-state">Nenhuma subscricao ativa neste mes.</p>`;
    }

    const visible = limit ? subscriptions.slice(0, limit) : subscriptions;
    const pages = [];
    for (let index = 0; index < visible.length; index += 3) {
      pages.push(visible.slice(index, index + 3));
    }

    return `
      <div class="subscription-home-carousel" aria-label="Subscricoes atuais">
        <div class="subscription-home-track">
          ${pages.map((page) => `
            <div class="subscription-home-page">
              ${page.map((item) => {
                const dueDate = subscriptionDateForMonth(item, month);
                return `
                  <button class="subscription-home-card" type="button" data-action="open-modal" data-modal="subscription" data-id="${item.id}">
                    ${renderSubscriptionLogo(item, "subscription-logo subscription-home-logo")}
                    <strong>${escapeHtml(subscriptionName(item))}</strong>
                    <em>${formatMoneyWithPrimary(item.amount, item.currency, month)}</em>
                    <small>Vence ${formatShortDate(dueDate)}</small>
                  </button>
                `;
              }).join("")}
            </div>
          `).join("")}
        </div>
        ${visible.length > 3 ? `<p class="carousel-hint">Arraste para ver mais</p>` : ""}
      </div>
    `;
  }

  function renderHousingPanel(limit) {
    const month = state.ui.selectedMonth;
    const cards = (state.housingCards || [])
      .filter((item) => item.active !== false)
      .filter((item) => inCountryScope(item.country));
    if (!cards.length) {
      return `
        <div class="empty-action">
          <p class="empty-state">Nenhuma moradia cadastrada.</p>
          <button class="small-action" type="button" data-action="open-modal" data-modal="housingCard">Cadastrar moradia</button>
        </div>
      `;
    }

    const visible = limit ? cards.slice(0, limit) : cards;
    return `
      <div class="housing-stack">
        ${visible.map((card) => renderHousingCard(card, month, Boolean(limit))).join("")}
      </div>
    `;
  }

  function renderHousingCard(card, month, compact = false) {
    const rows = housingCardMonthRows(card, month);
    const totalCurrency = primaryCurrency();
    const totalOpen = rows
      .filter((item) => !item.paid)
      .reduce((total, item) => total + convert(item.amount, item.currency, totalCurrency, latestRate(month)), 0);
    const paidCount = rows.filter((item) => item.paid).length;
    return `
      <div class="housing-card">
        <div class="housing-card-head">
          <div>
            <p class="mini-label">${countryMeta[card.country]?.label || "Global"}</p>
            <h3>${escapeHtml(card.name || "Moradia")}</h3>
          </div>
          <span class="chip gold">ALUGUEL</span>
        </div>
        <div class="housing-total">
          <span>Total aberto</span>
          <strong>${formatMoneyWithPrimary(totalOpen, totalCurrency, month)}</strong>
          <small>${paidCount}/${rows.length} pagos no mes</small>
        </div>
        <div class="housing-items">
          ${rows.length ? rows.map((item) => {
            const cardLabel = item.paymentMethod === "card"
              ? creditCardById(item.cardId)?.nickname || creditCardById(item.cardId)?.issuer || "cartao"
              : housingPaymentMethodLabel(item.paymentMethod);
            return `
              <div class="housing-item ${item.paid ? "is-paid" : ""}">
                <span class="row-icon ${item.paid ? "green" : "blue"}">${escapeHtml(item.icon)}</span>
                <div class="row-main">
                  <p class="row-title">${escapeHtml(item.label)}</p>
                  <p class="row-meta">vence ${formatShortDate(item.date)} - ${escapeHtml(cardLabel)}</p>
                </div>
                <div class="row-amount ${item.paid ? "income" : "expense"}">
                  ${formatMoneyWithPrimary(item.amount, item.currency, month)}
                  <div class="row-actions">
                    <button class="small-action ${item.paid ? "ghost" : ""}" type="button" data-action="pay-housing-item" data-id="${card.id}" data-item-key="${item.key}" ${item.paid ? "disabled" : ""}>${item.paid ? "Pago" : "Pagar"}</button>
                  </div>
                </div>
              </div>
            `;
          }).join("") : `<p class="empty-state">Informe o aluguel fixo ou adicione as contas conforme forem chegando.</p>`}
        </div>
        <div class="housing-actions">
          <button class="small-action ghost" type="button" data-action="open-modal" data-modal="housingCard" data-id="${card.id}">Editar</button>
          ${compact ? "" : `<button class="small-action ghost" type="button" data-action="delete-housing-card" data-id="${card.id}">Excluir</button>`}
        </div>
      </div>
    `;
  }

  function renderCardPurchasesList(limit) {
    const rows = cardPurchaseRows(state.ui.selectedMonth, "global");
    if (!rows.length) return `<p class="empty-state">Nenhuma compra de cartao neste mes.</p>`;
    const visible = limit ? rows.slice(0, limit) : rows;
    return `
      <div class="list">
        ${visible.map((row) => {
          const rowIcon = row.generated ? row.icon || "S" : `${row.installment}/${row.installments}`;
          const iconStyle = row.color ? ` style="background:${escapeAttr(row.color)}"` : "";
          const editModal = row.editModal || "cardPurchase";
          const deleteAction = row.deleteAction || (row.generated ? "" : "delete-card-purchase");
          return `
          <div class="list-row">
            <span class="row-icon blue"${iconStyle}>${escapeHtml(rowIcon)}</span>
            <div class="row-main">
              <p class="row-title">${escapeHtml(row.title)}</p>
              <p class="row-meta">${escapeHtml(row.cardName)} - ${escapeHtml(row.category || "Cartao")} - compra ${formatShortDate(row.purchaseDate)}</p>
            </div>
            <div class="row-amount expense">
              ${formatMoneyWithPrimary(row.amount, row.currency)}
              ${limit ? "" : `
                <div class="row-actions">
                  <button class="small-action ghost" type="button" data-action="open-modal" data-modal="${editModal}" data-id="${row.id}">Editar</button>
                  ${deleteAction ? `<button class="small-action ghost" type="button" data-action="${deleteAction}" data-id="${row.id}">Excluir</button>` : ""}
                </div>
              `}
            </div>
          </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderFinancialCalendar(limit, mode = "all") {
    const items = mode === "upcoming"
      ? dashboardUpcomingFinancialItems(limit || 99)
      : financialCalendarItems(state.ui.selectedMonth, "global");
    if (!items.length) return `<p class="empty-state">Nenhum evento financeiro neste mes.</p>`;
    const visible = mode === "upcoming" ? items : (limit ? items.slice(0, limit) : items);
    return `
      <div class="calendar-list">
        ${visible.map((item) => {
          const titleStyle = item.titleColor ? ` style="color:${escapeAttr(item.titleColor)}"` : "";
          return `
            <div class="calendar-item ${item.kind === "income" ? "calendar-income" : "calendar-expense"} ${item.tone}">
              <div class="calendar-date">
                <span>${formatCalendarDay(item.date)}</span>
                <small>${formatCalendarWeekday(item.date)}</small>
              </div>
              <div class="calendar-main">
                <p class="row-title"${titleStyle}>${escapeHtml(item.title)}</p>
                <p class="row-meta">${escapeHtml(item.meta)}</p>
              </div>
              <div class="calendar-amount ${item.kind === "income" ? "income" : "expense"}">
                ${item.kind === "income" ? "+" : "-"} ${formatMoneyWithPrimary(item.amount, item.currency, item.date?.slice(0, 7) || state.ui.selectedMonth)}
                <span class="chip ${item.tone}">${escapeHtml(item.status)}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderCryptoPanel(compact = false) {
    const assets = state.cryptoAssets || [];
    const summary = cryptoSummary();
    const status = cryptoStatusText();
    const rows = cryptoAssetRows();
    if (!assets.length) {
      return `
        <div class="crypto-empty">
          <div class="crypto-donut-placeholder">0</div>
          <p class="empty-state">Nenhuma cripto cadastrada.</p>
        </div>
      `;
    }

    return `
      <div class="crypto-wallet">
        <div class="crypto-wallet-hero">
          <div>
            <p class="mini-label">Valor atual</p>
            <strong>${formatMoneyWithPrimary(summary.totalValue, summary.currency)}</strong>
            <p class="row-meta">Investido ${formatCryptoInvestedSummary(summary)}</p>
          </div>
          <span class="chip ${summary.pnl >= 0 ? "green" : "red"}">${summary.pnl >= 0 ? "Valorizado" : "Desvalorizado"}</span>
        </div>

        ${renderCryptoAllocationBar(rows, summary)}

        <div class="chips crypto-status">
          <span class="chip ${status.tone}">${status.label}</span>
          ${compact ? "" : `<button class="small-action ghost" type="button" data-action="refresh-crypto">Atualizar</button>`}
        </div>

        ${renderCryptoTokenCards(rows, compact)}
      </div>
    `;
  }

  function renderCryptoAllocationBar(rows, summary) {
    const allocations = cryptoAllocationRows(rows, summary);
    if (!allocations.length) return `<p class="empty-state">Sem valor atual para montar a alocacao.</p>`;
    return `
      <div class="crypto-allocation">
        <div class="crypto-allocation-head">
          <span>Alocacao da carteira</span>
          <strong>100%</strong>
        </div>
        <div class="crypto-allocation-bar" aria-label="Alocacao da carteira cripto">
          ${allocations.map((item) => `
            <span
              title="${escapeAttr(`${item.symbol} ${formatPercent(item.pct)}`)}"
              style="--segment-color:${escapeAttr(item.color)};--segment-width:${Math.max(2, item.pct)}%;"
            ></span>
          `).join("")}
        </div>
        <div class="crypto-allocation-legend">
          ${allocations.map((item) => `
            <span><i style="background:${escapeAttr(item.color)}"></i>${escapeHtml(item.symbol)} ${formatPercent(item.pct)}</span>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderCryptoTokenCards(rows, compact = false) {
    if (!rows.length) return `<p class="empty-state">Nenhuma cripto cadastrada.</p>`;
    const displayRows = compact ? cryptoGroupedRows(rows) : rows;
    const visible = compact ? displayRows.slice(0, 4) : displayRows;
    return `
      <div class="crypto-token-list">
        ${visible.map((item) => `
          <div class="crypto-token-card">
            ${renderCryptoTokenIcon(item)}
            <div class="crypto-token-main">
              <div class="crypto-token-head">
                <div>
                  <p class="row-title">${escapeHtml(item.name)}</p>
                  <p class="row-meta">${formatCryptoAmount(item.quantity)} ${escapeHtml(item.symbol)} - ${escapeHtml(item.provider)}</p>
                </div>
                <span class="chip ${item.pnl >= 0 ? "green" : "red"}">${item.pnl >= 0 ? "Valorizou" : "Desvalorizou"}</span>
              </div>
              <div class="crypto-token-grid">
                <div>
                  <span>Investido</span>
                  <strong>${formatMoneyWithPrimary(item.rawCost, item.costCurrency, item.purchaseDate?.slice(0, 7) || state.ui.selectedMonth)}</strong>
                </div>
                <div>
                  <span>Valor atual</span>
                  <strong>${formatMoneyWithPrimary(item.value, item.currency)}</strong>
                </div>
                <div>
                  <span>Resultado</span>
                  <strong class="${item.pnl >= 0 ? "income" : "expense"}">${formatSignedMoney(item.pnl, item.currency)}</strong>
                  <small>${formatPercent(item.pnlPct)}</small>
                </div>
              </div>
              ${compact ? "" : `
                <div class="crypto-token-actions">
                  <p class="row-meta">Comprado em ${formatShortDate(item.purchaseDate)}</p>
                  <div class="row-actions">
                    <button class="small-action ghost" type="button" data-action="open-modal" data-modal="crypto" data-id="${item.id}">Editar</button>
                    <button class="small-action ghost" type="button" data-action="delete-crypto" data-id="${item.id}">Excluir</button>
                  </div>
                </div>
              `}
            </div>
          </div>
        `).join("")}
      </div>
      ${compact && displayRows.length > visible.length ? `<p class="empty-state subtle">Mostrando ${visible.length} de ${displayRows.length} criptos na carteira.</p>` : ""}
    `;
  }

  function cryptoGroupedRows(rows) {
    const grouped = rows.reduce((map, row) => {
      const current = map.get(row.symbol) || {
        id: row.symbol,
        symbol: row.symbol,
        name: row.name,
        color: row.color,
        quantity: 0,
        rawCost: 0,
        costCurrency: row.currency,
        cost: 0,
        price: row.price,
        value: 0,
        pnl: 0,
        pnlPct: 0,
        provider: "Total acumulado",
        purchaseDate: row.purchaseDate,
        currency: row.currency
      };
      current.quantity += row.quantity;
      current.cost += row.cost;
      current.value += row.value;
      current.pnl += row.pnl;
      current.rawCost += convert(row.rawCost, row.costCurrency, row.currency, latestRate(row.purchaseDate?.slice(0, 7) || state.ui.selectedMonth));
      current.purchaseDate = current.purchaseDate && current.purchaseDate < row.purchaseDate ? current.purchaseDate : row.purchaseDate;
      map.set(row.symbol, current);
      return map;
    }, new Map());

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        rawCost: item.cost,
        costCurrency: item.currency,
        pnlPct: item.cost ? round((item.pnl / item.cost) * 100, 2) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }

  function renderCryptoTokenIcon(item) {
    const asset = cryptoLogoAsset(item);
    if (asset) {
      return `
        <span class="crypto-token-icon has-logo" style="background:${escapeAttr(item.color)}">
          <img src="./assets/crypto/${escapeAttr(asset)}" alt="" loading="lazy" />
        </span>
      `;
    }
    return `<span class="crypto-token-icon" style="background:${escapeAttr(item.color)}">${escapeHtml(item.symbol.slice(0, 1))}</span>`;
  }

  function cryptoLogoAsset(item) {
    const symbol = String(item?.symbol || "").toUpperCase();
    const meta = cryptoCatalog[symbol];
    if (meta?.asset) return meta.asset;
    const name = normalizeLookupText(item?.name || meta?.name || symbol);
    const aliases = [
      ["bitcoin", "bitcoin.png"],
      ["btc", "bitcoin.png"],
      ["ethereum", "ethereum.png"],
      ["eth", "ethereum.png"],
      ["solana", "solana.png"],
      ["sol", "solana.png"],
      ["tether", "tether.png"],
      ["usdt", "tether.png"],
      ["usdc", "usdc.png"],
      ["binance", "binance.png"],
      ["bnb", "binance.png"],
      ["avalanche", "avalanche.png"],
      ["avax", "avalanche.png"],
      ["polygon", "polygon.png"],
      ["matic", "polygon.png"],
      ["shiba", "shiba-inu.png"],
      ["shib", "shiba-inu.png"],
      ["monero", "monero.png"],
      ["xmr", "monero.png"],
      ["tron", "trx.png"],
      ["trx", "trx.png"],
      ["xrp", "xrp.png"]
    ];
    const found = aliases.find(([alias]) => name.includes(alias) || normalizeLookupText(symbol).includes(alias));
    return found?.[1] || "";
  }

  function cryptoAllocationRows(rows, summary) {
    const total = Math.max(0, summary?.totalValue || sum(rows, "value"));
    if (!total) return [];
    const grouped = rows.reduce((map, row) => {
      const current = map.get(row.symbol) || {
        symbol: row.symbol,
        name: row.name,
        color: row.color,
        value: 0
      };
      current.value += row.value;
      map.set(row.symbol, current);
      return map;
    }, new Map());
    return Array.from(grouped.values())
      .map((item) => ({ ...item, pct: round((item.value / total) * 100, 2) }))
      .sort((a, b) => b.value - a.value);
  }

  function renderIncomePanel(limit) {
    const sources = state.incomeSources || [];
    const monthRows = monthWorkIncomes(state.ui.selectedMonth);
    const visibleSources = limit ? sources.slice(0, limit) : sources;
    const rate = latestRate(state.ui.selectedMonth);
    const totalCurrency = primaryCurrency();
    const total = monthRows.reduce((current, item) => current + convert(item.amount, item.currency || totalCurrency, totalCurrency, rate), 0);

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
          <strong>${formatMoneyWithPrimary(total, totalCurrency)}</strong>
        </div>
        <div class="stat-box">
          <p class="mini-label">Fontes</p>
          <strong>${sources.length}</strong>
        </div>
      </div>
      <div class="list source-list">
        ${visibleSources.map((source) => {
          const rows = monthRows.filter((row) => row.sourceId === source.id);
          const sourceCurrency = source.currency || primaryCurrency();
          const amount = rows.reduce((totalValue, row) => (
            totalValue + convert(row.amount, row.currency || sourceCurrency, sourceCurrency, rate)
          ), 0);
          return `
            <div class="list-row compact source-row">
              <div>
                <p class="row-title"><span class="source-dot" style="background:${escapeAttr(source.color)}"></span>${escapeHtml(source.name)}</p>
                <p class="row-meta">${escapeHtml(sourceTypeLabel(source))} - ${sourceCurrency}</p>
              </div>
              <div class="row-amount income">
                ${formatMoneyWithPrimary(amount, sourceCurrency)}
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
      ${!limit && monthRows.length ? `
        <div class="income-payments-block">
          <p class="mini-label">Pagamentos do mes</p>
          ${renderIncomePaymentsList(monthRows)}
        </div>
      ` : ""}
    `;
  }

  function renderIncomeSourcesSettingsPanel() {
    const sources = state.incomeSources || [];
    if (!sources.length) {
      return `
        <div class="empty-action">
          <p class="empty-state">Nenhuma empresa cadastrada.</p>
          <button class="small-action" type="button" data-action="open-modal" data-modal="incomeSource">Adicionar empresa</button>
        </div>
      `;
    }

    return `
      <div class="list source-list">
        ${sources.map((source) => `
          <div class="list-row compact source-row">
            <div>
              <p class="row-title"><span class="source-dot" style="background:${escapeAttr(source.color)}"></span>${escapeHtml(source.name)}</p>
              <p class="row-meta">${escapeHtml(sourceTypeLabel(source))} - ${source.currency || "JPY"}</p>
              <p class="row-meta">Pagamento: ${escapeHtml(source.payRule || "agenda nao informada")}</p>
            </div>
            <div class="row-actions">
              <button class="small-action ghost" type="button" data-action="open-modal" data-modal="incomeSource" data-id="${source.id}">Editar</button>
              <button class="small-action ghost" type="button" data-action="delete-income-source" data-id="${source.id}">Excluir</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderIncomePaymentsPanel(limit) {
    const rows = monthWorkIncomes(state.ui.selectedMonth);
    const sources = state.incomeSources || [];
    if (!sources.length) {
      return `
        <div class="empty-action">
          <p class="empty-state">Cadastre uma empresa em Ajustes antes de adicionar recebimentos.</p>
          <button class="small-action" type="button" data-action="set-tab" data-tab="settings">Ir para ajustes</button>
        </div>
      `;
    }
    if (!rows.length) {
      return `
        <div class="empty-action">
          <p class="empty-state">Nenhum pagamento recebido neste mes.</p>
          <button class="small-action" type="button" data-action="open-modal" data-modal="workIncome">Adicionar recebimento</button>
        </div>
      `;
    }
    return renderIncomePaymentsList(limit ? rows.slice(0, limit) : rows);
  }

  function renderIncomeReport() {
    const rows = monthWorkIncomes(state.ui.selectedMonth);
    if (!rows.length) return `<p class="empty-state">Nenhum recebimento neste mes.</p>`;
    return renderIncomePaymentsList(rows);
  }

  function renderIncomePaymentsList(rows) {
    return `
      <div class="list">
        ${rows.map((item) => {
          const source = incomeSourceById(item.sourceId);
          return `
            <div class="list-row">
              <span class="row-icon" style="background:${escapeAttr(source.color)}">¥</span>
              <div class="row-main">
                <p class="row-title">${escapeHtml(source.name)}</p>
                <p class="row-meta">${formatShortDate(item.date)} - ${escapeHtml(sourceTypeLabel(source))} - ${item.currency || source.currency || "JPY"}</p>
              </div>
              <div class="row-amount income">
                + ${formatMoneyWithPrimary(item.amount, item.currency || source.currency || PRIMARY_CURRENCY, item.date?.slice(0, 7) || state.ui.selectedMonth)}
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
    const hasInsurance = vehicleHasInsurance(vehicle);
    const insuranceCard = vehicle.insurancePaymentType === "card" ? creditCardById(vehicle.insuranceCardId) : null;
    const brand = vehicleBrand(vehicle);
    const model = vehicleModelName(vehicle);

    if (!brand && !model && !vehicle.plate) {
      return `
        <div class="empty-action">
          <p class="empty-state">Nenhum veiculo cadastrado.</p>
          <button class="small-action" type="button" data-action="open-modal" data-modal="vehicle">Cadastrar veiculo</button>
        </div>
      `;
    }

    return `
      <div class="vehicle-card">
        <div class="vehicle-visual" aria-hidden="true">
          <div class="vehicle-image">
            <span class="vehicle-car-body"></span>
            <span class="vehicle-car-window"></span>
            <span class="vehicle-wheel left"></span>
            <span class="vehicle-wheel right"></span>
          </div>
        </div>
        <div class="vehicle-main">
          <p class="mini-label">${escapeHtml(brand || "Marca")}</p>
          <strong>${escapeHtml(model || "Veiculo")}</strong>
          <span class="vehicle-plate">${escapeHtml(vehicle.plate || "-- --")}</span>
        </div>
        <div class="vehicle-info-card">
          <span class="row-icon gold">C</span>
          <div>
            <p class="mini-label">Shaken</p>
            <strong>${vehicle.shakenDueDate ? formatShortDate(vehicle.shakenDueDate) : "--"}</strong>
            <small>Validade</small>
          </div>
        </div>
        <label class="vehicle-insurance-check">
          <input type="checkbox" disabled ${hasInsurance ? "checked" : ""} />
          <span>${hasInsurance ? "Possui seguro" : "Sem seguro"}</span>
          ${hasInsurance ? `<strong>${formatMoneyWithPrimary(vehicle.insuranceAmount || 0, "JPY", state.ui.selectedMonth)}</strong>` : ""}
          ${insuranceCard || vehicle.insuranceCompany ? `<small>${escapeHtml(insuranceCard?.nickname || insuranceCard?.issuer || vehicle.insuranceCompany)}</small>` : ""}
        </label>
      </div>
    `;
  }

  function renderVehicleMaintenancePanel(limit) {
    const maintenance = (state.vehicleMaintenance || [])
      .filter((item) => item.date && item.date.slice(0, 7) === state.ui.selectedMonth)
      .sort((a, b) => b.date.localeCompare(a.date));
    const visible = limit ? maintenance.slice(0, limit) : maintenance;

    if (!visible.length) return `<p class="empty-state vehicle-maintenance-empty">Nenhuma manutencao registrada neste mes.</p>`;

    return `
      <div class="vehicle-maintenance-list">
        <p class="mini-label">Manutencoes do mes</p>
        <div class="list">
          ${visible.map((item) => `
            <div class="list-row compact">
              <div>
                <p class="row-title">${escapeHtml(item.kind)}</p>
                <p class="row-meta">${formatShortDate(item.date)} - ${escapeHtml(item.location || "local nao informado")} - ${escapeHtml(item.paymentMethod || "pagamento")}</p>
              </div>
              <div class="row-amount expense">
                ${formatMoneyWithPrimary(item.amount, item.currency || PRIMARY_CURRENCY, item.date?.slice(0, 7) || state.ui.selectedMonth)}
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
      </div>
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
            <div class="row-amount expense">${formatMoneyWithPrimary(item.amount, item.currency, item.date?.slice(0, 7) || state.ui.selectedMonth)}</div>
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
                ${isIncome ? "+" : "-"} ${formatMoneyWithPrimary(item.amount, item.currency, item.date?.slice(0, 7) || state.ui.selectedMonth)}
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

  function openModal(type, id = "") {
    const map = {
      addHub: renderAddHubModal,
      transaction: renderTransactionModal,
      transfer: renderTransferModal,
      commitment: renderCommitmentModal,
      debt: renderDebtModal,
      investment: renderInvestmentModal,
      creditCard: renderCreditCardModal,
      cardPurchase: renderCardPurchaseModal,
      crypto: renderCryptoModal,
      web3Wallet: renderWeb3WalletModal,
      housingCard: renderHousingCardModal,
      vehicle: renderVehicleModal,
      vehicleMaintenance: renderVehicleMaintenanceModal,
      incomeSource: renderIncomeSourceModal,
      workIncome: renderWorkIncomeModal,
      subscription: renderSubscriptionModal
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
    updateIncomeSourceOtherField();
    updateCommitmentCategoryField();
    updateCommitmentProviderField();
    updateSubscriptionCardField();
    updateSubscriptionCustomField();
    updateVehicleInsuranceCardField();
  }

  function closeModal() {
    modalRoot.innerHTML = "";
  }

  function renderAddHubModal() {
    const actions = [
      { modal: "incomeSource", icon: "E", title: "Cadastro de Empresa", meta: "Fontes como fabrica, Amazon, Uber e renda extra" },
      { modal: "workIncome", icon: "¥", title: "Cadastro de Pagamento", meta: "Recebimento ligado a uma empresa cadastrada" },
      { modal: "vehicle", icon: "V", title: "Cadastrar veiculo", meta: "Carro do Japao, Shaken, seguro e dados principais" },
      { modal: "housingCard", icon: "A", title: "Cadastrar moradia", meta: "Aluguel, luz, gas, agua e internet em um unico card" },
      { modal: "creditCard", icon: "C", title: "Cadastrar cartao", meta: "Cartao do Brasil ou Japao com bandeira e vencimento" },
      { modal: "subscription", icon: "S", title: "Cadastrar subscricao", meta: "Streaming, apps e servicos recorrentes no Pix ou cartao" },
      { modal: "crypto", icon: "B", title: "Cadastrar cripto", meta: "Quantidade comprada, custo e acompanhamento de cotacao" },
      { modal: "web3Wallet", icon: "W", title: "Conectar carteira web3", meta: "MetaMask e carteiras EVM para ver endereco, rede e saldo" },
      { modal: "commitment", icon: "F", title: "Cadastrar contas", meta: "Despesas fixas, financiamentos, consorcios e recorrencias" },
      { modal: "investment", icon: "I", title: "Cadastrar investimentos", meta: "Instituicao, saldo atual e aporte mensal" },
      { modal: "transaction", icon: "+", title: "Lancamento avulso", meta: "Entrada ou despesa unica fora dos cadastros acima" }
    ];
    return `
      <div class="modal-head">
        <h2>Adicionar</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <div class="add-hub-grid">
        ${actions.map((item) => `
          <button class="add-hub-option" type="button" data-action="open-modal" data-modal="${item.modal}">
            <span class="row-icon">${item.icon}</span>
            <span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.meta)}</small>
            </span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderTransactionModal(item = null) {
    const activeCountry = item?.country || (state.ui.activeCountry === "global" ? "japao" : state.ui.activeCountry);
    const currency = countryMeta[activeCountry].currency;
    const selectedCurrency = item?.currency || currency;
    const date = item?.date || dateInMonth(state.ui.selectedMonth, new Date().getDate());
    const transactionType = item?.type || "expense";
    const transactionTypes = ["expense", "income"];
    if (item?.type && !transactionTypes.includes(item.type)) transactionTypes.push(item.type);
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
              ${transactionTypes.map((key) => `<option value="${key}" ${selectedAttr(key, transactionType)}>${typeMeta[key]?.label || key}</option>`).join("")}
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
              ${currencyOptions(selectedCurrency)}
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
    const commitmentType = item?.type || "expense";
    const categoryKey = normalizedCommitmentCategory(item?.category);
    const categoryCustom = categoryKey === "other" ? item?.category || "" : "";
    const dueDate = commitmentDueDate(item);
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
              <option value="expense" ${selectedAttr("expense", commitmentType)}>Despesa</option>
              <option value="debt" ${selectedAttr("debt", commitmentType)}>Financiamento</option>
              <option value="card" ${selectedAttr("card", commitmentType)}>Cartao</option>
              <option value="consortium" ${selectedAttr("consortium", commitmentType)}>Consorcio</option>
              <option value="investment" ${selectedAttr("investment", commitmentType)}>Investimento</option>
            </select>
          </div>
        </div>
        <div class="two-cols">
          <div class="field commitment-provider-field ${commitmentType === "expense" ? "is-hidden" : ""}">
            <label for="provider">Fornecedor</label>
            <input id="provider" name="provider" ${commitmentType === "expense" ? "" : "required"} placeholder="Ex: Santander" value="${escapeAttr(item?.provider || "")}" />
          </div>
          <div class="field commitment-title-field ${commitmentType === "expense" ? "is-wide" : ""}">
            <label for="commitmentTitle">Nome</label>
            <input id="commitmentTitle" name="title" required placeholder="Ex: Luz, agua, gas" value="${escapeAttr(item?.title || "")}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="commitmentCategory">Categoria</label>
            <select id="commitmentCategory" name="categoryKey" required>
              ${Object.entries(commitmentCategoryMeta).map(([key, label]) => `<option value="${key}" ${selectedAttr(key, categoryKey)}>${label}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="commitmentAmount">Valor</label>
            <input id="commitmentAmount" name="amount" required type="number" min="0" step="0.01" value="${item ? number(item.amount) : ""}" />
          </div>
          <div class="field">
            <label for="dueDate">Vencimento</label>
            <input id="dueDate" name="dueDate" required type="date" value="${escapeAttr(dueDate)}" />
          </div>
        </div>
        <div class="field commitment-category-other ${categoryKey === "other" ? "" : "is-hidden"}">
          <label for="commitmentCategoryOther">Descreva a categoria</label>
          <input id="commitmentCategoryOther" name="categoryOther" placeholder="Ex: Assinatura, saude, pets" value="${escapeAttr(categoryCustom)}" />
        </div>
        <div class="field">
          <label for="commitmentCurrency">Moeda</label>
          <select id="commitmentCurrency" name="currency">
            ${currencyOptions(selectedCurrency)}
          </select>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="frequency">Frequencia</label>
            <select id="frequency" name="frequency">
              <option value="monthly" ${selectedAttr("monthly", item?.frequency || "monthly")}>Mensal</option>
              <option value="yearly" ${selectedAttr("yearly", item?.frequency)}>Anual</option>
              <option value="once" ${selectedAttr("once", item?.frequency)}>Uma vez</option>
            </select>
          </div>
          <div class="field">
            <label for="alertDays">Avisar quantos dias antes</label>
            <input id="alertDays" name="alertDays" type="number" min="0" max="60" value="${item?.alertDays ?? 3}" />
          </div>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar conta</button>
        </div>
      </form>
    `;
  }

  function renderDebtModalLegacy(item = null) {
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
              ${currencyOptions(selectedCurrency)}
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

  function renderDebtModal(item = null) {
    const activeCountry = item?.country || (state.ui.activeCountry === "global" ? "brasil" : state.ui.activeCountry);
    const selectedCurrency = item?.currency || countryMeta[activeCountry].currency;
    const startDate = item?.startDate || dateInMonth(state.ui.selectedMonth, 1);
    return `
      <div class="modal-head">
        <h2>${item ? "Editar contrato" : "Novo contrato"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="debt">
        ${editHidden(item)}
        <datalist id="debtProviderOptions">
          ${debtProviderOptions.map((provider) => `<option value="${escapeAttr(provider)}"></option>`).join("")}
        </datalist>
        <datalist id="debtPaymentMethodOptions">
          ${debtPaymentMethodOptions.map((method) => `<option value="${escapeAttr(method)}"></option>`).join("")}
        </datalist>
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
            <input id="debtProvider" name="provider" list="debtProviderOptions" required placeholder="Ex: Santander" value="${escapeAttr(item?.provider || "")}" />
          </div>
          <div class="field">
            <label for="debtTitle">Nome</label>
            <input id="debtTitle" name="title" required placeholder="Ex: Apto Vitoria A" value="${escapeAttr(item?.title || "")}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="originalAmount">Valor contratado</label>
            <input id="originalAmount" name="originalAmount" required type="number" min="0" step="0.01" value="${item ? number(item.originalAmount) : ""}" />
          </div>
          <div class="field">
            <label for="installmentAmount">Valor da parcela</label>
            <input id="installmentAmount" name="installmentAmount" required type="number" min="0" step="0.01" value="${item ? number(item.installmentAmount) : ""}" />
          </div>
          <div class="field">
            <label for="debtCurrency">Moeda</label>
            <select id="debtCurrency" name="currency">
              ${currencyOptions(selectedCurrency)}
            </select>
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="debtStartDate">Data de inicio do contrato</label>
            <input id="debtStartDate" name="startDate" type="date" value="${escapeAttr(startDate)}" />
          </div>
          <div class="field">
            <label for="contractedInstallments">Parcelas contratadas</label>
            <input id="contractedInstallments" name="contractedInstallments" type="number" min="1" max="600" step="1" value="${item ? number(item.contractedInstallments) || "" : ""}" />
          </div>
          <div class="field">
            <label for="debtDueDay">Dia de vencimento</label>
            <input id="debtDueDay" name="dueDay" required type="number" min="1" max="31" value="${item?.dueDay || ""}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="annualInterestRate">Taxa de juros (% a.a.)</label>
            <input id="annualInterestRate" name="annualInterestRate" type="number" min="0" step="0.01" placeholder="Ex: 8.99" value="${item ? number(item.annualInterestRate) || "" : ""}" />
          </div>
          <div class="field">
            <label for="insuranceAmount">Valor do seguro</label>
            <input id="insuranceAmount" name="insuranceAmount" type="number" min="0" step="0.01" value="${item ? number(item.insuranceAmount) || "" : ""}" />
          </div>
          <div class="field">
            <label for="adminFeeAmount">Tarifa administrativa</label>
            <input id="adminFeeAmount" name="adminFeeAmount" type="number" min="0" step="0.01" value="${item ? number(item.adminFeeAmount) || "" : ""}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="paymentMethod">Forma de pagamento</label>
            <input id="paymentMethod" name="paymentMethod" list="debtPaymentMethodOptions" placeholder="Ex: debito automatico" value="${escapeAttr(item?.paymentMethod || "")}" />
          </div>
          <div class="field">
            <label for="contractLast4">Numero do contrato (4 ultimos)</label>
            <input id="contractLast4" name="contractLast4" inputmode="numeric" maxlength="4" pattern="[0-9]*" placeholder="Ex: 1234" value="${escapeAttr(item?.contractLast4 || "")}" />
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
              ${currencyOptions(selectedCurrency)}
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
              ${currencyOptions(selectedCurrency)}
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
              ${currencyOptions(item?.currency || fallbackCurrency)}
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

  function renderSubscriptionModal(item = null) {
    const activeCountry = item?.country || (state.ui.activeCountry === "global" ? "japao" : state.ui.activeCountry);
    const selectedCurrency = item?.currency || countryMeta[activeCountry].currency;
    const serviceKey = item?.serviceKey || "spotify";
    const paymentMethod = item?.paymentMethod || "card";
    const cards = state.creditCards || [];
    const dueDate = item?.dueDate || dateInMonth(state.ui.selectedMonth, item?.dueDay || new Date().getDate());
    return `
      <div class="modal-head">
        <h2>${item ? "Editar subscricao" : "Nova subscricao"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="subscription">
        ${editHidden(item)}
        <div class="two-cols">
          ${countrySelect(activeCountry)}
          <div class="field">
            <label for="subscriptionServiceKey">Servico</label>
            <select id="subscriptionServiceKey" name="serviceKey">
              ${Object.entries(subscriptionCatalog).map(([key, meta]) => `<option value="${key}" ${selectedAttr(key, serviceKey)}>${escapeHtml(meta.name)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field subscription-custom-field ${serviceKey === "other" ? "" : "is-hidden"}">
          <label for="subscriptionCustomName">Nome do servico</label>
          <input id="subscriptionCustomName" name="customName" placeholder="Ex: app, clube, ferramenta" value="${escapeAttr(item?.customName || "")}" />
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="subscriptionAmount">Valor</label>
            <input id="subscriptionAmount" name="amount" required type="number" min="0" step="0.01" value="${item ? number(item.amount) : ""}" />
          </div>
          <div class="field">
            <label for="subscriptionCurrency">Moeda</label>
            <select id="subscriptionCurrency" name="currency">
              ${currencyOptions(selectedCurrency)}
            </select>
          </div>
          <div class="field">
            <label for="subscriptionDueDate">Vencimento</label>
            <input id="subscriptionDueDate" name="dueDate" required type="date" value="${escapeAttr(dueDate)}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="subscriptionPaymentMethod">Forma de pagamento</label>
            <select id="subscriptionPaymentMethod" name="paymentMethod">
              <option value="card" ${selectedAttr("card", paymentMethod)}>Cartao de credito</option>
              <option value="pix" ${selectedAttr("pix", paymentMethod)}>Pix</option>
            </select>
          </div>
          <div class="field subscription-card-field ${paymentMethod === "card" ? "" : "is-hidden"}">
            <label for="subscriptionCardId">Cartao</label>
            <select id="subscriptionCardId" name="cardId">
              <option value="">Selecione</option>
              ${cards.map((card) => `<option value="${card.id}" ${selectedAttr(card.id, item?.cardId)}>${escapeHtml(card.nickname || card.issuer)} - ${countryMeta[card.country]?.short || "JP"} - ${card.currency}</option>`).join("")}
            </select>
          </div>
        </div>
        ${!cards.length ? `<p class="empty-state subscription-card-hint">Cadastre um cartao para conectar a subscricao na fatura mensal.</p>` : ""}
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar subscricao</button>
        </div>
      </form>
    `;
  }

  function renderCryptoModal(item = null) {
    const symbol = String(item?.symbol || "BTC").toUpperCase();
    const cryptoName = item?.customName || "";
    return `
      <div class="modal-head">
        <h2>${item ? "Editar cripto" : "Nova cripto"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="crypto">
        ${editHidden(item)}
        <div class="three-cols">
          <div class="field">
            <label for="cryptoSymbol">Cripto</label>
            <input id="cryptoSymbol" name="symbol" required list="cryptoSymbolOptions" maxlength="16" placeholder="Ex: BTC, SOL, PEPE" value="${escapeAttr(symbol)}" />
            <datalist id="cryptoSymbolOptions">
              ${Object.entries(cryptoCatalog).map(([key, meta]) => `<option value="${key}">${escapeHtml(meta.name)}</option>`).join("")}
            </datalist>
          </div>
          <div class="field">
            <label for="cryptoCustomName">Nome</label>
            <input id="cryptoCustomName" name="customName" placeholder="Opcional" value="${escapeAttr(cryptoName)}" />
          </div>
          <div class="field">
            <label for="cryptoQuantity">Quantidade</label>
            <input id="cryptoQuantity" name="quantity" required type="text" inputmode="decimal" placeholder="0.00027018" value="${item ? formatCryptoInputValue(item.quantity) : ""}" />
          </div>
        </div>
        <div class="three-cols">
          <div class="field">
            <label for="cryptoCost">Valor comprado</label>
            <input id="cryptoCost" name="costAmount" required type="text" inputmode="decimal" value="${item ? formatPlainNumber(item.costAmount) : ""}" />
          </div>
          <div class="field">
            <label for="cryptoCurrency">Moeda da compra</label>
            <select id="cryptoCurrency" name="costCurrency">
              ${currencyOptions(item?.costCurrency || primaryCurrency())}
            </select>
          </div>
          <div class="field">
            <label for="cryptoDate">Data</label>
            <input id="cryptoDate" name="purchaseDate" type="date" value="${escapeAttr(item?.purchaseDate || dateInMonth(state.ui.selectedMonth, new Date().getDate()))}" />
          </div>
        </div>
        <div class="field">
          <label for="cryptoProvider">Banco ou corretora</label>
          <input id="cryptoProvider" name="provider" value="${escapeAttr(item?.provider || item?.note || "")}" placeholder="Ex: Nubank, Binance, Mercado Bitcoin" />
        </div>
        <div class="field">
          <label for="cryptoNote">Observacao</label>
          <textarea id="cryptoNote" name="note" placeholder="Observacao opcional">${escapeHtml(item?.note || "")}</textarea>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar cripto</button>
        </div>
      </form>
    `;
  }

  function renderWeb3WalletModal() {
    const wallet = normalizeWeb3Wallet(state.web3Wallet);
    const connected = Boolean(wallet.address);
    return `
      <div class="modal-head">
        <h2>Conectar carteira Web3</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <div class="web3-connect-modal">
        <div class="web3-wallet-card ${connected ? "is-connected" : ""}">
          <div class="web3-wallet-orb">W3</div>
          <div class="web3-wallet-main">
            <span class="mini-label">${connected ? "Carteira conectada" : "MetaMask / carteira EVM"}</span>
            <strong>${connected ? escapeHtml(shortAddress(wallet.address)) : "Conectar Web3"}</strong>
            <p class="row-meta">${connected ? `${escapeHtml(wallet.networkName || "Rede Web3")} - ${formatCryptoAmount(wallet.balance)} ${escapeHtml(wallet.symbol)}` : "Abra pelo navegador da carteira no celular ou instale a extensao no computador."}</p>
          </div>
        </div>
        <div class="web3-safety-list">
          <div>
            <strong>Somente leitura por enquanto</strong>
            <span>Vamos consultar endereco, rede e saldo nativo.</span>
          </div>
          <div>
            <strong>Sem seed phrase</strong>
            <span>O app nunca pede nem salva frase secreta ou chave privada.</span>
          </div>
          <div>
            <strong>Binance depois via nuvem</strong>
            <span>A API secret da Binance deve ficar em variavel segura no Cloudflare.</span>
          </div>
        </div>
        ${wallet.error ? `<p class="row-meta web3-error">${escapeHtml(wallet.error)}</p>` : ""}
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          ${connected ? `<button class="secondary-button" type="button" data-action="disconnect-web3">Desconectar</button>` : ""}
          <button class="primary-button" type="button" data-action="connect-web3">${connected ? "Atualizar carteira" : "Conectar carteira"}</button>
        </div>
      </div>
    `;
  }

  function renderHousingCardModal(item = null) {
    const activeCountry = item?.country || "japao";
    const selectedCurrency = item?.currency || countryMeta[activeCountry]?.currency || primaryCurrency();
    const services = normalizeHousingItems(item?.items, selectedCurrency);
    const cards = state.creditCards || [];
    return `
      <div class="modal-head">
        <h2>${item ? "Editar moradia" : "Nova moradia"}</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="housing-card">
        ${editHidden(item)}
        <div class="two-cols">
          <div class="field">
            <label for="housingName">Nome do local</label>
            <input id="housingName" name="name" required placeholder="Ex: Apartamento Kariya" value="${escapeAttr(item?.name || "")}" />
          </div>
          ${countrySelect(activeCountry)}
        </div>
        <div class="field">
          <label for="housingCurrency">Moeda padrao</label>
          <select id="housingCurrency" name="currency">
            ${currencyOptions(selectedCurrency)}
          </select>
        </div>
        <div class="housing-form-list">
          ${services.map((service) => renderHousingServiceFormRow(service, cards)).join("")}
        </div>
        ${!cards.length ? `<p class="empty-state">Para pagar algum item no cartao, cadastre um cartao primeiro.</p>` : ""}
        <div class="form-actions">
          <button class="secondary-button" type="button" data-action="close-modal">Cancelar</button>
          <button class="primary-button" type="submit">Salvar moradia</button>
        </div>
      </form>
    `;
  }

  function renderHousingServiceFormRow(service, cards) {
    const key = service.key;
    return `
      <div class="housing-form-row">
        <label class="housing-service-toggle">
          <input type="checkbox" name="${key}Active" ${service.active !== false ? "checked" : ""} />
          <span>${escapeHtml(service.label)}</span>
        </label>
        <div class="field">
          <label for="${key}Amount">Valor</label>
          <input id="${key}Amount" name="${key}Amount" type="number" min="0" step="0.01" value="${number(service.amount) || ""}" />
        </div>
        <div class="field">
          <label for="${key}DueDay">Vencimento</label>
          <input id="${key}DueDay" name="${key}DueDay" type="number" min="1" max="31" value="${service.dueDay || 1}" />
        </div>
        <div class="field">
          <label for="${key}PaymentMethod">Pagamento</label>
          <select id="${key}PaymentMethod" name="${key}PaymentMethod">
            ${Object.entries(housingPaymentMethodMeta).map(([value, label]) => `<option value="${value}" ${selectedAttr(value, service.paymentMethod)}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="${key}CardId">Cartao</label>
          <select id="${key}CardId" name="${key}CardId">
            <option value="">Sem cartao</option>
            ${cards.map((card) => `<option value="${card.id}" ${selectedAttr(card.id, service.cardId)}>${escapeHtml(card.nickname || card.issuer)} - ${card.currency}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
  }

  function renderVehicleModal() {
    const vehicle = state.vehicle || {};
    const cards = state.creditCards || [];
    const insurancePaymentType = normalizeVehicleInsurancePaymentType(vehicle);
    const brand = vehicleBrand(vehicle);
    const model = vehicleModelName(vehicle);
    return `
      <div class="modal-head">
        <h2>Veiculo Japao</h2>
        <button class="close-button" type="button" data-action="close-modal" aria-label="Fechar">x</button>
      </div>
      <form class="form-grid" data-form="vehicle">
        <div class="two-cols">
          <div class="field">
            <label for="vehicleBrand">Marca</label>
            <input id="vehicleBrand" name="brand" value="${escapeAttr(brand)}" placeholder="Ex: Daihatsu" />
          </div>
          <div class="field">
            <label for="vehicleModel">Modelo</label>
            <input id="vehicleModel" name="model" value="${escapeAttr(model)}" placeholder="Ex: Move" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="vehiclePlate">Placa</label>
            <input id="vehiclePlate" name="plate" value="${escapeAttr(vehicle.plate || "")}" placeholder="Ex: 11-22" />
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
            <label for="vehicleInsurancePaymentType">Como paga</label>
            <select id="vehicleInsurancePaymentType" name="insurancePaymentType">
              <option value="bank" ${selectedAttr("bank", insurancePaymentType)}>Conta/debito</option>
              <option value="card" ${selectedAttr("card", insurancePaymentType)}>Cartao de credito</option>
              <option value="cash" ${selectedAttr("cash", insurancePaymentType)}>Dinheiro</option>
            </select>
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="insuranceCompany">Empresa do seguro</label>
            <input id="insuranceCompany" name="insuranceCompany" value="${escapeAttr(vehicle.insuranceCompany || "")}" placeholder="Ex: Sompo, Tokio Marine" />
          </div>
          <div class="field vehicle-insurance-card-field ${insurancePaymentType === "card" ? "" : "is-hidden"}">
            <label for="vehicleInsuranceCardId">Cartao do seguro</label>
            <select id="vehicleInsuranceCardId" name="insuranceCardId">
              <option value="">Selecione</option>
              ${cards.map((card) => `<option value="${card.id}" ${selectedAttr(card.id, vehicle.insuranceCardId)}>${escapeHtml(card.nickname || card.issuer)} - ${countryMeta[card.country]?.short || "JP"} - ${card.currency}</option>`).join("")}
            </select>
          </div>
        </div>
        ${!cards.length ? `<p class="empty-state vehicle-card-hint">Cadastre um cartao para conectar o seguro mensal na fatura.</p>` : ""}
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
    const sourceType = normalizedSourceType(item?.type);
    const customType = item?.customType || (sourceType === "other" && item?.type && !incomeSourceTypeMeta[item.type] ? item.type : "");
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
            <input id="sourceName" name="name" required placeholder="Ex: Fabrica, Amazon, Uber" value="${escapeAttr(item?.name || "")}" />
          </div>
          <div class="field">
            <label for="sourceType">Tipo</label>
            <select id="sourceType" name="type">
              <option value="factory" ${selectedAttr("factory", sourceType)}>Fabrica</option>
              <option value="amazon" ${selectedAttr("amazon", sourceType)}>Amazon</option>
              <option value="uber" ${selectedAttr("uber", sourceType)}>Uber</option>
              <option value="extra" ${selectedAttr("extra", sourceType)}>Renda Extra</option>
              <option value="other" ${selectedAttr("other", sourceType)}>Outros</option>
            </select>
          </div>
        </div>
        <div class="field other-source-field ${sourceType === "other" ? "" : "is-hidden"}">
          <label for="sourceCustomType">Descreva o tipo</label>
          <input id="sourceCustomType" name="customType" placeholder="Ex: Servico particular, bonus, outro app" value="${escapeAttr(customType)}" />
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="sourceColor">Cor</label>
            <input id="sourceColor" name="color" type="color" value="${nextColor}" />
          </div>
          <div class="field">
            <label for="sourceCurrency">Moeda</label>
            <select id="sourceCurrency" name="currency">
              ${currencyOptions(item?.currency || primaryCurrency())}
            </select>
          </div>
        </div>
        <div class="field">
          <label for="sourcePayRule">Agenda de pagamento</label>
          <input id="sourcePayRule" name="payRule" placeholder="Ex: toda quarta, toda terca, dia 25" value="${escapeAttr(item?.payRule || "")}" />
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
    const selectedSource = item ? incomeSourceById(item.sourceId) : sources[0];
    const selectedCurrency = item?.currency || selectedSource?.currency || "JPY";
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
        <div class="two-cols">
          <div class="field">
            <label for="incomeSourceId">Empresa</label>
            <select id="incomeSourceId" name="sourceId">
              ${sources.map((source) => `<option value="${source.id}" data-currency="${escapeAttr(source.currency || "JPY")}" ${selectedAttr(source.id, item?.sourceId || sources[0]?.id)}>${escapeHtml(source.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="incomeAmount">Valor recebido</label>
            <input id="incomeAmount" name="amount" type="number" min="0" step="0.01" required value="${item ? number(item.amount) : ""}" />
          </div>
        </div>
        <div class="two-cols">
          <div class="field">
            <label for="incomeDate">Data de pagamento</label>
            <input id="incomeDate" name="date" type="date" required value="${escapeAttr(item?.date || dateInMonth(state.ui.selectedMonth, new Date().getDate()))}" />
          </div>
          <div class="field">
            <label for="incomeCurrency">Moeda</label>
            <select id="incomeCurrency" name="currency">
              ${currencyOptions(selectedCurrency)}
            </select>
          </div>
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
    const dueDate = data.dueDate || commitmentDueDate(current);
    const dueDay = parseLocalDate(dueDate).getDate();
    const type = data.type || "expense";
    const updated = upsertItem("commitments", data.id, {
      country: data.country,
      provider: type === "expense" ? "" : String(data.provider || "").trim(),
      title: data.title.trim(),
      category: commitmentCategoryFromForm(data),
      type,
      amount: number(data.amount),
      currency: data.currency,
      dueDate,
      dueDay: clamp(dueDay, 1, 31),
      frequency: data.frequency || "monthly",
      startMonth: dueDate.slice(0, 7),
      endMonth: "",
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
    const current = findItem("debts", data.id);
    const contractLast4 = String(data.contractLast4 || "").replace(/\D/g, "").slice(-4);
    const draft = {
      ...(current || {}),
      country: data.country,
      provider: data.provider.trim(),
      title: data.title.trim(),
      type: data.type,
      originalAmount: number(data.originalAmount),
      installmentAmount: number(data.installmentAmount),
      currency: data.currency,
      dueDay: clamp(Math.round(number(data.dueDay)), 1, 31),
      startDate: data.startDate || "",
      contractedInstallments: clamp(Math.round(number(data.contractedInstallments)), 0, 600),
      paymentMethod: String(data.paymentMethod || "").trim(),
      annualInterestRate: number(data.annualInterestRate),
      insuranceAmount: number(data.insuranceAmount),
      adminFeeAmount: number(data.adminFeeAmount),
      contractLast4
    };
    draft.outstandingAmount = debtEstimatedOutstanding(draft);
    const updated = upsertItem("debts", data.id, draft);
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

  function saveSubscription(form) {
    const data = formData(form);
    const dueDate = data.dueDate || dateInMonth(state.ui.selectedMonth, 1);
    const dueDay = parseLocalDate(dueDate).getDate();
    const paymentMethod = data.paymentMethod || "card";
    if (paymentMethod === "card" && !data.cardId) {
      showToast("Selecione o cartao da subscricao.");
      return;
    }
    const updated = upsertItem("subscriptions", data.id, {
      country: data.country,
      serviceKey: data.serviceKey || "other",
      customName: String(data.customName || "").trim(),
      amount: number(data.amount),
      currency: data.currency,
      dueDate,
      dueDay: clamp(dueDay, 1, 31),
      startMonth: dueDate.slice(0, 7),
      paymentMethod,
      cardId: paymentMethod === "card" ? data.cardId : "",
      active: true
    }, true);
    state.ui.selectedMonth = dueDate.slice(0, 7);
    saveState();
    closeModal();
    render();
    showToast(updated ? "Subscricao atualizada." : "Subscricao salva.");
  }

  function saveCryptoAsset(form) {
    const data = formData(form);
    const symbol = normalizeCryptoSymbol(data.symbol || "BTC");
    const updated = upsertItem("cryptoAssets", data.id, {
      symbol,
      customName: data.customName.trim(),
      quantity: cryptoQuantityText(data.quantity),
      costAmount: number(data.costAmount),
      costCurrency: data.costCurrency,
      purchaseDate: data.purchaseDate || dateInMonth(state.ui.selectedMonth, new Date().getDate()),
      provider: data.provider.trim(),
      note: data.note.trim(),
      updatedAt: new Date().toISOString()
    });
    saveState({ remoteNow: true });
    closeModal();
    render();
    refreshCryptoQuotes(true);
    showToast(updated ? "Cripto atualizada." : "Cripto salva.");
  }

  function saveHousingCard(form) {
    try {
      const data = formData(form);
      const currency = sanitizeCurrency(data.currency, primaryCurrency());
      const items = housingItemTemplates.map((template) => {
        const paymentMethod = housingPaymentMethodMeta[data[`${template.key}PaymentMethod`]]
          ? data[`${template.key}PaymentMethod`]
          : "bank";
        const cardId = paymentMethod === "card" ? data[`${template.key}CardId`] || "" : "";
        if (paymentMethod === "card" && !cardId && data[`${template.key}Active`]) {
          throw new Error(`Selecione o cartao de ${template.label}.`);
        }
        return {
          key: template.key,
          label: template.label,
          active: data[`${template.key}Active`] === "on",
          amount: number(data[`${template.key}Amount`]),
          currency,
          dueDay: clamp(Math.round(number(data[`${template.key}DueDay`])), 1, 31),
          paymentMethod,
          cardId
        };
      });
      const updated = upsertItem("housingCards", data.id, {
        name: data.name.trim(),
        country: data.country,
        currency,
        active: true,
        items
      });
      saveState();
      closeModal();
      render();
      showToast(updated ? "Moradia atualizada." : "Moradia salva.");
    } catch (error) {
      showToast(error.message || "Nao consegui salvar a moradia.");
    }
  }

  function saveVehicle(form) {
    const data = formData(form);
    const insurancePaymentType = normalizeVehicleInsurancePaymentType({ insurancePaymentType: data.insurancePaymentType });
    if (number(data.insuranceAmount) > 0 && insurancePaymentType === "card" && !data.insuranceCardId) {
      showToast("Selecione o cartao do seguro.");
      return;
    }
    state.vehicle = {
      brand: data.brand.trim(),
      model: data.model.trim(),
      plate: data.plate.trim(),
      shakenDueDate: data.shakenDueDate,
      insuranceAmount: number(data.insuranceAmount),
      insuranceDay: data.insuranceDay ? clamp(Math.round(number(data.insuranceDay)), 1, 31) : "",
      insuranceCompany: data.insuranceCompany.trim(),
      insurancePaymentMethod: vehicleInsurancePaymentLabel(insurancePaymentType),
      insurancePaymentType,
      insuranceCardId: insurancePaymentType === "card" ? data.insuranceCardId : "",
      currency: "JPY",
      updatedAt: new Date().toISOString()
    };
    saveState({ remoteNow: true });
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
      note: data.note.trim(),
      updatedAt: new Date().toISOString()
    }, true);
    state.ui.selectedMonth = data.date.slice(0, 7);
    saveState({ remoteNow: true });
    closeModal();
    render();
    showToast(updated ? "Manutencao atualizada." : "Manutencao salva.");
  }

  function saveIncomeSource(form) {
    const data = formData(form);
    const sourceType = normalizedSourceType(data.type);
    const updated = upsertItem("incomeSources", data.id, {
      name: data.name.trim(),
      type: sourceType,
      customType: sourceType === "other" ? String(data.customType || "").trim() : "",
      hourlyRate: 0,
      color: data.color || sourceColors[state.incomeSources.length % sourceColors.length],
      currency: data.currency || "JPY",
      payRule: String(data.payRule || "").trim()
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
      currency: data.currency || source.currency || "JPY",
      date: data.date,
      periodStart: "",
      periodEnd: "",
      workDays: 0,
      hirukinDays: 0,
      yakinDays: 0,
      weekendDays: 0,
      hourlyRate: 0,
      note: ""
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
    const baseCurrency = sanitizeCurrency(data.baseCurrency, PRIMARY_CURRENCY);
    state.settings.baseCurrency = baseCurrency;
    state.settings.secondaryCurrency = sanitizeSecondaryCurrency(data.secondaryCurrency, baseCurrency);
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
      date: commitmentDateForMonth(item, state.ui.selectedMonth),
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

  function payHousingItem(housingId, itemKey) {
    const card = findItem("housingCards", housingId);
    if (!card) return;
    const item = housingItemByKey(card, itemKey);
    if (!item || item.active === false) return;
    const month = state.ui.selectedMonth;
    const key = housingPaymentKey(housingId, itemKey, month);
    if (state.paidCommitments[key]) {
      showToast("Item ja pago neste mes.");
      return;
    }
    if (!number(item.amount)) {
      showToast("Informe um valor antes de pagar.");
      return;
    }

    const dueDate = housingItemDateForMonth(item, month);
    state.paidCommitments[key] = true;

    if (item.paymentMethod === "card") {
      const creditCard = creditCardById(item.cardId);
      if (!creditCard) {
        delete state.paidCommitments[key];
        showToast("Cartao nao encontrado para este pagamento.");
        return;
      }
      state.cardPurchases.unshift({
        id: uid("cp"),
        cardId: creditCard.id,
        country: creditCard.country,
        title: `${item.label} - ${card.name || "Moradia"}`,
        category: "Moradia",
        totalAmount: number(item.amount),
        currency: item.currency,
        installments: 1,
        firstBillMonth: month,
        purchaseDate: dueDate,
        note: "Criado a partir do card de moradia"
      });
      saveState();
      render();
      showToast("Pagamento enviado para a fatura do cartao.");
      return;
    }

    state.transactions.unshift({
      id: uid("tx"),
      date: dueDate,
      country: card.country,
      type: "expense",
      title: `${item.label} - ${card.name || "Moradia"}`,
      category: "Moradia",
      amount: number(item.amount),
      currency: item.currency,
      note: `Pago via ${housingPaymentMethodLabel(item.paymentMethod)}`
    });
    saveState();
    render();
    showToast("Pagamento lancado no saldo.");
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
    link.download = `nekuma-finance-${state.ui.selectedMonth}.json`;
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
    const balancePie = document.getElementById("balance-pie-chart");
    if (balancePie) drawBalancePieChart(balancePie);
    const trend = document.getElementById("trend-chart");
    if (trend) drawTrendChart(trend);
    const category = document.getElementById("category-chart");
    if (category) drawCategoryChart(category);
    const country = document.getElementById("country-chart");
    if (country) drawCountryChart(country);
    const crypto = document.getElementById("crypto-donut-chart");
    if (crypto) drawCryptoDonutChart(crypto);
    const cryptoValue = document.getElementById("crypto-value-chart");
    if (cryptoValue) drawCryptoValueChart(cryptoValue);
  }

  function drawBalancePieChart(canvas) {
    const ctx = prepCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const data = dashboardBalanceBreakdown();
    const received = Math.max(0, data.received);
    const payables = Math.max(0, data.payables);
    const total = Math.max(1, received + payables);
    const receivedAngle = (received / total) * Math.PI * 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.34;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = Math.max(18, radius * 0.26);
    ctx.lineCap = "round";
    const lineWidth = ctx.lineWidth;

    ctx.beginPath();
    ctx.strokeStyle = "#ded4c4";
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (!received && !payables) {
      drawLightLegend(ctx, [["Sem dados", "#ded4c4"]], 12, 14);
      bindCanvasTooltip(canvas, () => null);
      return;
    }

    if (received) {
      ctx.beginPath();
      ctx.strokeStyle = "#42a67a";
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + receivedAngle);
      ctx.stroke();
    }

    if (payables) {
      ctx.beginPath();
      ctx.strokeStyle = "#d95d4e";
      ctx.arc(centerX, centerY, radius, -Math.PI / 2 + receivedAngle + 0.08, Math.PI * 1.5 - 0.04);
      ctx.stroke();
    }

    drawLightLegend(ctx, [
      ["Recebido", "#42a67a"],
      ["A pagar", "#d95d4e"]
    ], 12, 14);

    const segments = [
      { label: "Recebido no mes", value: received, color: "#42a67a", start: -Math.PI / 2, end: -Math.PI / 2 + receivedAngle },
      { label: "Contas a pagar", value: payables, color: "#d95d4e", start: -Math.PI / 2 + receivedAngle + 0.08, end: Math.PI * 1.5 - 0.04 }
    ].filter((item) => item.value > 0);

    bindCanvasTooltip(canvas, (event) => {
      const point = canvasPointerPoint(canvas, event);
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < radius - lineWidth || distance > radius + lineWidth) return null;
      const angle = normalizeAngle(Math.atan2(dy, dx));
      const hit = segments.find((segment) => angleInRange(angle, segment.start, segment.end));
      if (!hit) return null;
      return {
        title: hit.label,
        lines: [formatMoneyWithPrimary(hit.value, data.currency)],
        color: hit.color
      };
    });
  }

  function drawLightLegend(ctx, items, x, y) {
    let cursor = x;
    items.forEach(([label, color]) => {
      roundRect(ctx, cursor, y - 8, 10, 10, 4, color);
      ctx.fillStyle = "rgba(255, 250, 240, 0.78)";
      ctx.font = "750 11px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(label, cursor + 15, y + 1);
      cursor += ctx.measureText(label).width + 42;
    });
  }

  function bindCanvasTooltip(canvas, hitTest) {
    canvas.onpointermove = (event) => {
      const hit = hitTest(event);
      if (hit) showChartTooltip(event, hit);
      else hideChartTooltip();
    };
    canvas.onpointerleave = hideChartTooltip;
    canvas.onpointerdown = (event) => {
      const hit = hitTest(event);
      if (!hit) return;
      showChartTooltip(event, hit);
      clearTimeout(canvas.__tooltipTimer);
      canvas.__tooltipTimer = setTimeout(hideChartTooltip, 2600);
    };
  }

  function canvasPointerPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function normalizeAngle(angle) {
    return (angle + Math.PI * 2) % (Math.PI * 2);
  }

  function angleInRange(angle, start, end) {
    const normalizedStart = normalizeAngle(start);
    const normalizedEnd = normalizeAngle(end);
    if (normalizedStart <= normalizedEnd) return angle >= normalizedStart && angle <= normalizedEnd;
    return angle >= normalizedStart || angle <= normalizedEnd;
  }

  function showChartTooltip(event, hit) {
    const tooltip = chartTooltipElement();
    tooltip.innerHTML = `
      <span style="background:${escapeAttr(hit.color || "#312c51")}"></span>
      <div>
        <strong>${escapeHtml(hit.title)}</strong>
        ${hit.lines.map((line) => `<small>${line}</small>`).join("")}
      </div>
    `;
    const offset = 14;
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    const maxLeft = Math.max(12, window.innerWidth - tooltip.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - tooltip.offsetHeight - 12);
    tooltip.style.left = `${Math.max(12, Math.min(maxLeft, event.clientX + offset))}px`;
    tooltip.style.top = `${Math.max(12, Math.min(maxTop, event.clientY + offset))}px`;
    tooltip.classList.add("is-visible");
  }

  function hideChartTooltip() {
    document.getElementById("chart-tooltip")?.classList.remove("is-visible");
  }

  function chartTooltipElement() {
    let tooltip = document.getElementById("chart-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "chart-tooltip";
      tooltip.className = "chart-tooltip";
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  function drawTrendChart(canvas) {
    const ctx = prepCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const months = recentMonthsFrom(state.ui.selectedMonth, 6);
    const series = months.map((month) => {
      const s = summarizeMonth(month, "global");
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
    const hitAreas = [];

    series.forEach((entry, index) => {
      const x = padding.left + index * slot + slot / 2;
      const incomeH = (entry.income / maxValue) * chartH;
      const outH = (entry.outflow / maxValue) * chartH;
      const yBase = padding.top + chartH;
      roundRect(ctx, x - barW - 2, yBase - incomeH, barW, incomeH, 5, "#42a67a");
      roundRect(ctx, x + 2, yBase - outH, barW, outH, 5, "#d95d4e");
      hitAreas.push({
        x: x - barW - 8,
        y: yBase - Math.max(4, incomeH) - 6,
        w: barW + 12,
        h: Math.max(8, incomeH) + 12,
        color: "#42a67a",
        title: `${entry.label} - entradas`,
        value: entry.income,
        currency: entry.currency
      });
      hitAreas.push({
        x: x - 4,
        y: yBase - Math.max(4, outH) - 6,
        w: barW + 12,
        h: Math.max(8, outH) + 12,
        color: "#d95d4e",
        title: `${entry.label} - saidas`,
        value: entry.outflow,
        currency: entry.currency
      });
      ctx.fillStyle = "#766f62";
      ctx.font = "700 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(entry.label, x, height - 14);
    });

    drawLegend(ctx, [
      ["Entradas", "#42a67a"],
      ["Saidas", "#d95d4e"]
    ], 12, 14);

    bindCanvasTooltip(canvas, (event) => {
      const point = canvasPointerPoint(canvas, event);
      const hit = hitAreas.find((area) => (
        point.x >= area.x && point.x <= area.x + area.w && point.y >= area.y && point.y <= area.y + area.h
      ));
      if (!hit) return null;
      return {
        title: hit.title,
        lines: [formatMoneyWithPrimary(hit.value, hit.currency)],
        color: hit.color
      };
    });
  }

  function drawCategoryChart(canvas) {
    const ctx = prepCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const data = categoryTotals(state.ui.selectedMonth, "global");
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
    const targetCurrency = primaryCurrency();
    const brOut = convert(br.expenses + br.investments, "BRL", targetCurrency, rate);
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
      [`Brasil ${formatCompact(brOut, targetCurrency)}`, "#42a67a"],
      [`Japao ${formatCompact(jpOut, targetCurrency)}`, "#f5c84c"]
    ], 12, 14);
  }

  function drawCryptoDonutChart(canvas) {
    const ctx = prepCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const summary = cryptoSummary();
    const progress = clamp(summary.totalBtcQuantity, 0, 1);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.34;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = Math.max(16, radius * 0.22);
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.strokeStyle = "#ded4c4";
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (!summary.totalBtcQuantity) return;

    ctx.beginPath();
    ctx.strokeStyle = cryptoCatalog.BTC.color;
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
  }

  function drawCryptoValueChart(canvas) {
    const ctx = prepCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const summary = cryptoSummary();
    const maxValue = Math.max(1, summary.totalCost, summary.totalValue);
    const left = 82;
    const right = 18;
    const barH = 18;
    const rows = [
      ["Investido", summary.totalCost, "#f5c84c"],
      ["Atual", summary.totalValue, summary.pnl >= 0 ? "#42a67a" : "#d95d4e"]
    ];

    ctx.clearRect(0, 0, width, height);
    rows.forEach((row, index) => {
      const [label, value, color] = row;
      const y = 18 + index * 38;
      const barW = ((width - left - right) * value) / maxValue;
      ctx.fillStyle = "#312c51";
      ctx.font = "850 12px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(label, 10, y + 14);
      roundRect(ctx, left, y, width - left - right, barH, 7, "rgba(49, 44, 81, 0.1)");
      roundRect(ctx, left, y, Math.max(4, barW), barH, 7, color);
      ctx.fillStyle = "#766f62";
      ctx.font = "800 11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(formatCompact(value, summary.currency), width - right, y + 14);
    });
  }

  function setupWeb3Listeners() {
    const provider = web3Provider();
    if (web3ListenersAttached || !provider?.on) return;
    web3ListenersAttached = true;

    provider.on("accountsChanged", (accounts = []) => {
      const address = Array.isArray(accounts) ? accounts[0] : "";
      if (!address) {
        disconnectWeb3Wallet();
        return;
      }
      state.web3Wallet = normalizeWeb3Wallet({
        ...(state.web3Wallet || {}),
        address,
        status: "connected",
        error: ""
      });
      saveState({ remoteNow: true });
      refreshWeb3Wallet();
    });

    provider.on("chainChanged", (chainId) => {
      const meta = web3NetworkMeta(chainId);
      state.web3Wallet = normalizeWeb3Wallet({
        ...(state.web3Wallet || {}),
        chainId,
        networkName: meta.name,
        symbol: meta.symbol,
        status: state.web3Wallet?.address ? "connected" : "idle",
        error: ""
      });
      saveState({ remoteNow: true });
      refreshWeb3Wallet();
    });
  }

  async function connectWeb3Wallet() {
    const provider = web3Provider();
    if (!provider?.request) {
      state.web3Wallet = normalizeWeb3Wallet({
        ...(state.web3Wallet || {}),
        status: "error",
        error: "Carteira Web3 nao encontrada. No celular, abra o app pelo navegador da MetaMask ou outra carteira compativel."
      });
      saveState();
      render();
      showToast("Carteira Web3 nao encontrada.");
      return;
    }
    setupWeb3Listeners();

    if (web3FetchInFlight) return;
    web3FetchInFlight = true;
    state.web3Wallet = normalizeWeb3Wallet({
      ...(state.web3Wallet || {}),
      status: "loading",
      error: ""
    });
    render();

    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) ? accounts[0] : "";
      if (!address) throw new Error("Nenhuma conta foi autorizada na carteira.");
      const wallet = await readWeb3WalletSnapshot(provider, address);
      state.web3Wallet = normalizeWeb3Wallet(wallet);
      saveState({ remoteNow: true });
      closeModal();
      render();
      showToast("Carteira Web3 conectada.");
    } catch (error) {
      state.web3Wallet = normalizeWeb3Wallet({
        ...(state.web3Wallet || {}),
        status: state.web3Wallet?.address ? "connected" : "error",
        error: web3ErrorMessage(error)
      });
      saveState();
      render();
      showToast("Nao consegui conectar a carteira.");
    } finally {
      web3FetchInFlight = false;
    }
  }

  async function refreshWeb3Wallet() {
    const provider = web3Provider();
    if (!state.web3Wallet?.address) {
      await connectWeb3Wallet();
      return;
    }
    if (!provider?.request) {
      state.web3Wallet = normalizeWeb3Wallet({
        ...(state.web3Wallet || {}),
        status: "error",
        error: "Carteira Web3 nao encontrada neste navegador."
      });
      saveState();
      render();
      return;
    }
    if (web3FetchInFlight) return;
    web3FetchInFlight = true;
    state.web3Wallet = normalizeWeb3Wallet({
      ...(state.web3Wallet || {}),
      status: "loading",
      error: ""
    });
    render();
    try {
      const wallet = await readWeb3WalletSnapshot(provider, state.web3Wallet.address);
      state.web3Wallet = normalizeWeb3Wallet(wallet);
      saveState({ remoteNow: true });
      render();
      showToast("Carteira Web3 atualizada.");
    } catch (error) {
      state.web3Wallet = normalizeWeb3Wallet({
        ...(state.web3Wallet || {}),
        status: "connected",
        error: web3ErrorMessage(error)
      });
      saveState();
      render();
      showToast("Nao consegui atualizar a carteira.");
    } finally {
      web3FetchInFlight = false;
    }
  }

  function disconnectWeb3Wallet() {
    state.web3Wallet = normalizeWeb3Wallet({});
    saveState({ remoteNow: true });
    closeModal();
    render();
    showToast("Carteira removida do app.");
  }

  async function readWeb3WalletSnapshot(provider, address) {
    const chainId = await provider.request({ method: "eth_chainId" }).catch(() => "");
    const meta = web3NetworkMeta(chainId);
    const balanceHex = await provider.request({
      method: "eth_getBalance",
      params: [address, "latest"]
    }).catch(() => "0x0");

    return {
      address,
      chainId,
      networkName: meta.name,
      symbol: meta.symbol,
      balance: weiHexToNative(balanceHex),
      updatedAt: new Date().toISOString(),
      status: "connected",
      error: ""
    };
  }

  function web3Provider() {
    return window.ethereum || null;
  }

  function web3ProviderAvailable() {
    return Boolean(web3Provider()?.request);
  }

  function web3NetworkMeta(chainId) {
    const key = String(chainId || "").toLowerCase();
    return web3Networks[key] || { name: key ? `Rede ${key}` : "Rede Web3", symbol: "ETH" };
  }

  function weiHexToNative(value) {
    try {
      const wei = BigInt(String(value || "0x0"));
      return Number(wei) / 1e18;
    } catch (error) {
      return 0;
    }
  }

  function shortAddress(address) {
    const text = String(address || "");
    return text.length > 14 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text;
  }

  function web3ErrorMessage(error) {
    if (error?.code === 4001) return "Conexao cancelada na carteira.";
    return error?.message || "Nao foi possivel acessar a carteira Web3.";
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
        usdEur: quotes.usdEur,
        eurBrl: quotes.eurBrl,
        eurJpy: quotes.eurJpy,
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
      showToast("Nao consegui atualizar as cotacoes agora.");
    } finally {
      fxFetchInFlight = false;
    }
  }

  async function refreshPaypalBalance(force) {
    if (paypalFetchInFlight) return;
    const updatedAt = state.paypal?.updatedAt ? new Date(state.paypal.updatedAt).getTime() : 0;
    if (!force && Date.now() - updatedAt < 300000) return;

    paypalFetchInFlight = true;
    state.paypal = normalizePaypalState({
      ...(state.paypal || {}),
      status: "loading",
      error: "",
      notice: ""
    });
    render();

    let errorDiagnostics = null;
    try {
      const headers = { Accept: "application/json" };
      const accessToken = await currentSupabaseAccessToken();
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const response = await fetch("./api/paypal/balance", {
        cache: "no-store",
        headers
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        errorDiagnostics = payload.diagnostics || null;
        const diagnostics = errorDiagnostics
          ? ` Ambiente ${payload.diagnostics.env || "--"}, Client ID ${payload.diagnostics.clientId || "--"}, Secret ${payload.diagnostics.hasClientSecret ? "presente" : "ausente"}.`
          : "";
        throw new Error(`${payload.error || "PayPal indisponivel"}${diagnostics}`);
      }

      state.paypal = normalizePaypalState({
        ...payload,
        status: payload.status || (payload.balanceUnavailable ? "limited" : "ok"),
        updatedAt: payload.updatedAt || new Date().toISOString()
      });
      saveState();
      render();
      showToast("Saldo PayPal atualizado.");
    } catch (error) {
      state.paypal = normalizePaypalState({
        ...(state.paypal || {}),
        env: errorDiagnostics?.env || state.paypal?.env,
        status: "error",
        error: error.message || "Nao foi possivel consultar o PayPal."
      });
      saveState();
      render();
      showToast("Nao consegui atualizar o PayPal agora.");
    } finally {
      paypalFetchInFlight = false;
    }
  }

  async function currentSupabaseAccessToken() {
    if (!remoteStore.enabled || !remoteStore.client) return "";
    try {
      const { data } = await remoteStore.client.auth.getSession();
      return data?.session?.access_token || "";
    } catch (error) {
      return "";
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
    const response = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,JPY-BRL,USD-JPY,EUR-BRL,EUR-JPY,USD-EUR", { cache: "no-store" });
    if (!response.ok) throw new Error("Falha na cotacao BR");
    const data = await response.json();
    const usdBrl = Number(data.USDBRL?.bid || data.USDBRL?.ask || 0);
    const jpyBrl = Number(data.JPYBRL?.bid || data.JPYBRL?.ask || 0);
    const usdJpy = Number(data.USDJPY?.bid || data.USDJPY?.ask || 0) || (jpyBrl ? usdBrl / jpyBrl : 0);
    const eurBrl = Number(data.EURBRL?.bid || data.EURBRL?.ask || 0);
    const eurJpy = Number(data.EURJPY?.bid || data.EURJPY?.ask || 0) || (jpyBrl && eurBrl ? eurBrl / jpyBrl : 0);
    const usdEur = Number(data.USDEUR?.bid || data.USDEUR?.ask || 0) || (eurBrl ? usdBrl / eurBrl : 0);
    if (!usdBrl || !jpyBrl || !Number.isFinite(usdJpy) || !usdJpy || !eurBrl || !usdEur) throw new Error("Cotacao BR vazia");
    return {
      usdBrl,
      jpyBrl,
      usdJpy,
      usdEur,
      eurBrl,
      eurJpy,
      source: "AwesomeAPI",
      date: data.USDBRL?.create_date || data.USDJPY?.create_date || data.JPYBRL?.create_date || data.EURBRL?.create_date || ""
    };
  }

  async function fetchOpenExchangeQuotes() {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!response.ok) throw new Error("Falha na cotacao global");
    const data = await response.json();
    const brl = Number(data.rates?.BRL || 0);
    const jpy = Number(data.rates?.JPY || 0);
    const eur = Number(data.rates?.EUR || 0);
    if (!brl || !jpy || !eur) throw new Error("Cotacao global vazia");
    return {
      usdBrl: brl,
      jpyBrl: brl / jpy,
      usdJpy: jpy,
      usdEur: eur,
      eurBrl: brl / eur,
      eurJpy: jpy / eur,
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
    const currency = primaryCurrency();
    const rows = cryptoAssetRows(currency);
    const totalValue = sum(rows, "value");
    const totalCost = sum(rows, "cost");
    const totalQuantity = sum(rows, "quantity");
    const totalBtcQuantity = rows
      .filter((item) => item.symbol === "BTC")
      .reduce((total, item) => total + item.quantity, 0);
    const pnl = totalValue - totalCost;
    const pnlPct = totalCost ? round((pnl / totalCost) * 100, 2) : 0;
    const btcProgressPct = round(totalBtcQuantity * 100, 8);
    const originalCosts = rows.reduce((items, row) => {
      const current = items.get(row.costCurrency) || 0;
      items.set(row.costCurrency, current + row.rawCost);
      return items;
    }, new Map());
    return {
      currency,
      totalValue,
      totalCost,
      totalQuantity,
      totalBtcQuantity,
      btcProgressPct,
      pnl,
      pnlPct,
      originalCosts: Array.from(originalCosts.entries()).map(([costCurrency, amount]) => ({ currency: costCurrency, amount }))
    };
  }

  function cryptoAssetRows(currency = primaryCurrency()) {
    const rate = latestRate(state.ui.selectedMonth);
    return (state.cryptoAssets || []).map((item) => {
      const symbol = normalizeCryptoSymbol(item.symbol || "BTC");
      const meta = cryptoCatalog[symbol] || { name: symbol, color: "#f5c84c" };
      const quantity = cryptoQuantityNumber(item.quantity);
      const rawCost = number(item.costAmount);
      const costCurrency = item.costCurrency || currency;
      const cost = convert(rawCost, costCurrency, currency, rate);
      const average = quantity ? cost / quantity : 0;
      const price = cryptoPrice(symbol, currency) || average;
      const value = price * quantity;
      const pnl = value - cost;
      const pnlPct = cost ? round((pnl / cost) * 100, 2) : 0;
      return {
        id: item.id,
        symbol,
        name: item.customName || meta.name,
        color: meta.color,
        quantity,
        rawCost,
        costCurrency,
        cost,
        price,
        value,
        pnl,
        pnlPct,
        provider: item.provider || item.note || "Banco/corretora nao informado",
        purchaseDate: item.purchaseDate || dateInMonth(state.ui.selectedMonth, 1),
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
    const targetCurrency = country === "brasil" ? "BRL" : primaryCurrency();
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

    plannedSubscriptionEntries(month, country).forEach((item) => {
      const converted = convert(item.amount, item.currency, targetCurrency, rate);
      expenses += converted;
      plannedExpenses += converted;
    });

    plannedHousingEntries(month, country).forEach((item) => {
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
        const converted = convert(item.amount, item.currency || primaryCurrency(), targetCurrency, rate);
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
    const actualOutflow = actualExpenses + actualInvestments + actualWiseOut + actualFees;
    const plannedOutflow = plannedExpenses + plannedInvestments;
    const actualInflow = actualIncome + actualBridgeIn;
    const projectedInflow = income + bridgeIn;
    const projectedOutflow = planned;
    const actualBalance = actualInflow - actualOutflow;
    const projectedBalance = projectedInflow - projectedOutflow;
    const coverage = projectedInflow
      ? clamp(Math.round((projectedBalance / projectedInflow) * 100), -999, 100)
      : projectedOutflow ? 0 : 100;
    const remaining = actualBalance;
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
      projectedBalance,
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
        const dueDate = commitmentDateForMonth(item, month);
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
    const startMonth = commitmentStartMonth(item);
    const endMonth = item.endMonth || "";
    if (startMonth && month < startMonth) return false;
    if (endMonth && month > endMonth) return false;
    if (frequency === "once") return startMonth ? month === startMonth : true;
    if (frequency === "yearly") {
      const dueMonth = commitmentDueDate(item).slice(5, 7);
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

  function commitmentCategoryFromForm(data) {
    const categoryKey = normalizedCommitmentCategory(data.categoryKey);
    if (categoryKey === "other") return String(data.categoryOther || "").trim() || "Outros";
    return commitmentCategoryMeta[categoryKey] || "Outros";
  }

  function normalizedCommitmentCategory(category) {
    const text = String(category || "").trim();
    if (!text) return "imovel";
    const normalized = normalizeLookupText(text);
    const match = Object.entries(commitmentCategoryMeta).find(([key, label]) => (
      key === normalized || normalizeLookupText(label) === normalized
    ));
    return match ? match[0] : "other";
  }

  function commitmentDueDate(item) {
    if (item?.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)) return item.dueDate;
    const month = item?.startMonth || state.ui.selectedMonth || currentMonth();
    const fallbackDay = item ? item.dueDay || 1 : new Date().getDate();
    return dateInMonth(month, fallbackDay);
  }

  function commitmentStartMonth(item) {
    if (item?.startMonth) return item.startMonth;
    if (item?.dueDate) return item.dueDate.slice(0, 7);
    return "";
  }

  function commitmentDateForMonth(item, month) {
    const dueDate = commitmentDueDate(item);
    const frequency = item?.frequency || "monthly";
    if (frequency === "once" && item?.dueDate) return dueDate;
    const dueDay = item?.dueDay || parseLocalDate(dueDate).getDate() || 1;
    return dateInMonth(month, dueDay);
  }

  function plannedHousingEntries(month, country) {
    return housingCalendarEntries(month, country).filter((item) => !item.paid);
  }

  function housingCalendarEntries(month, country) {
    return (state.housingCards || [])
      .filter((card) => card.active !== false)
      .filter((card) => country === "global" || card.country === country)
      .map((card) => {
        const summary = housingCardMonthSummary(card, month);
        if (!summary.rows.length || !summary.total) return null;
        const dueState = dueStateForDate(summary.date, summary.paid);
        return {
          id: `housing:${card.id}`,
          housingId: card.id,
          country: card.country,
          type: "expense",
          title: `Aluguel - ${card.name || "Moradia"}`,
          category: "Moradia",
          amount: summary.paid ? summary.total : summary.totalOpen,
          currency: summary.currency,
          date: summary.date,
          paid: summary.paid,
          status: summary.paid ? "Pago" : dueState.label,
          tone: summary.paid ? "green" : dueState.tone,
          meta: `Moradia - ${summary.openCount} aberto${summary.openCount === 1 ? "" : "s"} de ${summary.rows.length}`,
          kind: "expense"
        };
      })
      .filter(Boolean);
  }

  function housingCardMonthSummary(card, month) {
    const rows = housingCardMonthRows(card, month);
    const currency = card.currency || primaryCurrency();
    const rate = latestRate(month);
    const total = rows.reduce((sumValue, item) => sumValue + convert(item.amount, item.currency, currency, rate), 0);
    const totalOpen = rows
      .filter((item) => !item.paid)
      .reduce((sumValue, item) => sumValue + convert(item.amount, item.currency, currency, rate), 0);
    const openRows = rows.filter((item) => !item.paid);
    const rent = rows.find((item) => item.key === "rent");
    const firstOpen = openRows.slice().sort((a, b) => a.date.localeCompare(b.date))[0];
    const firstRow = rows.slice().sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      rows,
      currency,
      total,
      totalOpen,
      openCount: openRows.length,
      paid: Boolean(rows.length) && openRows.length === 0,
      date: rent?.date || firstOpen?.date || firstRow?.date || dateInMonth(month, 1)
    };
  }

  function housingCardMonthRows(card, month) {
    return normalizeHousingItems(card.items, card.currency || primaryCurrency())
      .filter((item) => item.active !== false)
      .filter((item) => number(item.amount) > 0)
      .map((item) => ({
        ...item,
        icon: housingItemTemplates.find((template) => template.key === item.key)?.icon || "M",
        date: housingItemDateForMonth(item, month),
        paid: isHousingItemPaid(card.id, item.key, month)
      }));
  }

  function housingItemByKey(card, key) {
    return normalizeHousingItems(card?.items, card?.currency || primaryCurrency())
      .find((item) => item.key === key);
  }

  function housingItemDateForMonth(item, month) {
    return dateInMonth(month, item?.dueDay || 1);
  }

  function housingPaymentMethodLabel(method) {
    return housingPaymentMethodMeta[method] || "Conta/debito";
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

  function plannedSubscriptionEntries(month, country) {
    return subscriptionCalendarEntries(month, country).filter((item) => item.paymentMethod !== "card");
  }

  function subscriptionCalendarEntries(month, country) {
    return monthSubscriptions(month, country)
      .filter((item) => item.paymentMethod !== "card")
      .map((item) => {
        const dueDate = subscriptionDateForMonth(item, month);
        const dueState = dueStateForDate(dueDate, false);
        const meta = subscriptionMeta(item);
        return {
          id: item.id,
          country: item.country,
          type: "expense",
          title: subscriptionName(item),
          category: "Subscricao",
          amount: number(item.amount),
          currency: item.currency,
          date: dueDate,
          status: dueState.label,
          tone: dueState.tone,
          meta: `Subscricao - ${item.paymentMethod === "pix" ? "Pix" : "Cartao"}`,
          kind: "expense",
          titleColor: meta.color
        };
      });
  }

  function financialCalendarItems(month, country) {
    const items = [
      ...commitmentCalendarEntries(month, country),
      ...housingCalendarEntries(month, country),
      ...cardBillCalendarEntries(month, country),
      ...subscriptionCalendarEntries(month, country),
      ...vehicleCalendarEntries(month, country),
      ...incomeCalendarEntries(month, country),
      ...wiseCalendarEntries(month, country)
    ];
    return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }

  function vehicleCalendarEntries(month, country) {
    if (country !== "global" && country !== "japao") return [];
    return vehicleMonthlyCosts(month)
      .filter((item) => item.id === "vehicle-insurance" || item.id === "vehicle-shaken")
      .map((item) => ({
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
        category: sourceTypeLabel(source),
        amount: number(item.amount),
        currency: item.currency || source.currency || "JPY",
        date: item.date,
        status: "Entrada",
        tone: "green",
        meta: "Pagamento recebido",
        kind: "income",
        titleColor: source.color
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
    const purchases = (state.cardPurchases || [])
      .flatMap((purchase) => {
        const card = creditCardById(purchase.cardId);
        if (!card) return [];
        if (country !== "global" && card.country !== country) return [];
        return cardPurchaseInstallmentRow(purchase, card, month);
      })
      .filter(Boolean);
    return [...purchases, ...subscriptionCardRows(month, country), ...vehicleInsuranceCardRows(month, country)]
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  }

  function cardPurchaseRowsForCard(cardId, month) {
    const purchases = (state.cardPurchases || [])
      .filter((purchase) => purchase.cardId === cardId)
      .map((purchase) => {
        const card = creditCardById(cardId);
        return card ? cardPurchaseInstallmentRow(purchase, card, month) : null;
      })
      .filter(Boolean);
    return [...purchases, ...subscriptionCardRowsForCard(cardId, month), ...vehicleInsuranceCardRowsForCard(cardId, month)];
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

  function subscriptionCardRows(month, country) {
    return (state.subscriptions || [])
      .flatMap((item) => {
        if (item.paymentMethod !== "card" || !isSubscriptionDueInMonth(item, month)) return [];
        const card = creditCardById(item.cardId);
        if (!card) return [];
        if (country !== "global" && card.country !== country) return [];
        return subscriptionCardRow(item, card, month);
      });
  }

  function subscriptionCardRowsForCard(cardId, month) {
    const card = creditCardById(cardId);
    if (!card) return [];
    return (state.subscriptions || [])
      .filter((item) => item.paymentMethod === "card" && item.cardId === cardId)
      .filter((item) => isSubscriptionDueInMonth(item, month))
      .map((item) => subscriptionCardRow(item, card, month));
  }

  function subscriptionCardRow(item, card, month) {
    const meta = subscriptionMeta(item);
    const rawAmount = number(item.amount);
    const rawCurrency = item.currency || card.currency;
    return {
      id: item.id,
      generated: true,
      editModal: "subscription",
      deleteAction: "delete-subscription",
      cardId: card.id,
      cardName: card.nickname || card.issuer,
      country: card.country,
      title: subscriptionName(item),
      category: "Subscricao",
      purchaseDate: subscriptionDateForMonth(item, month),
      installment: 1,
      installments: 1,
      rawAmount,
      rawCurrency,
      amount: convert(rawAmount, rawCurrency, card.currency, latestRate(month)),
      currency: card.currency,
      icon: meta.icon,
      color: meta.color
    };
  }

  function vehicleInsuranceCardRows(month, country) {
    const vehicle = state.vehicle || {};
    const card = creditCardById(vehicle.insuranceCardId);
    if (!card || country !== "global" && card.country !== country) return [];
    const row = vehicleInsuranceCardRow(vehicle, card, month);
    return row ? [row] : [];
  }

  function vehicleInsuranceCardRowsForCard(cardId, month) {
    const vehicle = state.vehicle || {};
    const card = creditCardById(cardId);
    if (!card || vehicle.insuranceCardId !== cardId) return [];
    const row = vehicleInsuranceCardRow(vehicle, card, month);
    return row ? [row] : [];
  }

  function vehicleInsuranceCardRow(vehicle, card, month) {
    const paymentType = normalizeVehicleInsurancePaymentType(vehicle);
    const rawAmount = number(vehicle.insuranceAmount);
    if (paymentType !== "card" || !rawAmount || !vehicle.insuranceCardId) return null;
    const rawCurrency = vehicle.currency || "JPY";
    return {
      id: `vehicle-insurance-${month}`,
      generated: true,
      editModal: "vehicle",
      cardId: card.id,
      cardName: card.nickname || card.issuer,
      country: card.country,
      title: `Seguro ${vehicle.insuranceCompany || vehicle.model || "veiculo"}`,
      category: "Veiculo",
      purchaseDate: dateInMonth(month, vehicle.insuranceDay || 1),
      installment: 1,
      installments: 1,
      rawAmount,
      rawCurrency,
      amount: convert(rawAmount, rawCurrency, card.currency, latestRate(month)),
      currency: card.currency,
      icon: "C",
      color: "#f0c38e"
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

  function monthKeyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function debtTypeLabel(type) {
    const labels = {
      financing: "Financiamento",
      consortium: "Consorcio",
      card: "Cartao",
      device: "Aparelho"
    };
    return labels[type] || "Contrato";
  }

  function debtProviderLabel(item) {
    return String(item?.provider || "Banco/empresa").trim() || "Banco/empresa";
  }

  function debtNextPaymentAmount(item) {
    return number(item?.installmentAmount);
  }

  function debtInstallmentProgress(item) {
    const original = number(item?.originalAmount);
    const storedOutstanding = number(item?.outstandingAmount);
    const installment = number(item?.installmentAmount);
    const total = Math.max(0, Math.round(number(item?.contractedInstallments)));
    const fallbackTotal = total || (original && installment ? Math.ceil(original / installment) : 0);
    if (!fallbackTotal) return { paid: 0, remaining: 0, total: 0 };

    let paid = 0;
    if (item?.startDate) {
      const start = parseLocalDate(item.startDate);
      const today = startOfDay(new Date());
      if (start <= today) {
        paid = monthDiff(monthKeyFromDate(start), currentMonth()) + 1;
        const dueDay = clamp(Math.round(number(item?.dueDay) || start.getDate()), 1, 31);
        if (today.getDate() < dueDay) paid -= 1;
      }
    } else if (original && storedOutstanding) {
      const paidRatio = clamp((original - storedOutstanding) / original, 0, 1);
      paid = Math.round(paidRatio * fallbackTotal);
    }

    paid = clamp(paid, 0, fallbackTotal);
    return {
      paid,
      remaining: Math.max(0, fallbackTotal - paid),
      total: fallbackTotal
    };
  }

  function debtEstimatedOutstanding(item) {
    const progress = debtInstallmentProgress(item);
    const original = number(item?.originalAmount);
    const storedOutstanding = number(item?.outstandingAmount);
    const installment = number(item?.installmentAmount);
    if (!progress.total) return round(storedOutstanding || original, 2);
    if (!progress.remaining) return 0;

    const annualRate = number(item?.annualInterestRate);
    const monthlyRate = annualRate > 0 ? Math.pow(1 + annualRate / 100, 1 / 12) - 1 : 0;
    let estimate = 0;
    if (installment > 0 && monthlyRate > 0) {
      estimate = installment * (1 - Math.pow(1 + monthlyRate, -progress.remaining)) / monthlyRate;
    } else if (original > 0) {
      estimate = original * (progress.remaining / progress.total);
    } else {
      estimate = installment * progress.remaining;
    }

    if (original > 0) estimate = Math.min(estimate, original);
    return round(Math.max(0, estimate), 2);
  }

  function incomeSourceById(id) {
    return (state.incomeSources || []).find((source) => source.id === id) || {
      id: "",
      name: "Renda",
      type: "extra",
      color: "#42a67a",
      currency: "JPY",
      hourlyRate: 0,
      customType: ""
    };
  }

  function subscriptionMeta(item) {
    return subscriptionCatalog[item?.serviceKey] || subscriptionCatalog.other;
  }

  function subscriptionLogoFile(item) {
    const meta = subscriptionMeta(item);
    if (meta.asset) return meta.asset;
    const lookup = normalizeLookupText(subscriptionName(item));
    const match = subscriptionLogoAliases.find(([alias]) => lookup.includes(normalizeLookupText(alias)));
    return match ? match[1] : "";
  }

  function renderSubscriptionLogo(item, className = "subscription-logo") {
    const meta = subscriptionMeta(item);
    const asset = subscriptionLogoFile(item);
    const image = asset
      ? `<img src="./assets/subscriptions/${escapeAttr(asset)}" alt="" loading="lazy" onerror="this.closest('.subscription-logo')?.classList.remove('has-image');this.remove();" />`
      : "";
    return `
      <span class="${escapeAttr(className)}${asset ? " has-image" : ""}" style="--subscription-color:${escapeAttr(meta.color)}">
        <span class="subscription-fallback">${escapeHtml(meta.icon)}</span>
        ${image}
      </span>
    `;
  }

  function subscriptionName(item) {
    const meta = subscriptionMeta(item);
    if (item?.serviceKey === "other") return item.customName || meta.name;
    return meta.name;
  }

  function monthSubscriptions(month, country) {
    return (state.subscriptions || [])
      .filter((item) => item.active !== false)
      .filter((item) => country === "global" || item.country === country || (item.cardId && creditCardById(item.cardId)?.country === country))
      .filter((item) => isSubscriptionDueInMonth(item, month))
      .sort((a, b) => subscriptionDateForMonth(a, month).localeCompare(subscriptionDateForMonth(b, month)));
  }

  function isSubscriptionDueInMonth(item, month) {
    if (item.active === false) return false;
    const startMonth = item.startMonth || item.dueDate?.slice(0, 7) || "";
    return !startMonth || month >= startMonth;
  }

  function subscriptionDateForMonth(item, month) {
    const dueDay = item?.dueDay || parseLocalDate(item?.dueDate).getDate() || 1;
    return dateInMonth(month, dueDay);
  }

  function normalizedSourceType(type) {
    const value = String(type || "factory");
    if (value === "salary") return "factory";
    if (["factory", "amazon", "uber", "extra", "other"].includes(value)) return value;
    return "other";
  }

  function sourceTypeLabel(source) {
    const type = normalizedSourceType(source?.type);
    if (type === "other") return source?.customType || "Outros";
    return incomeSourceTypeMeta[type] || "Renda";
  }

  function updateIncomeSourceOtherField() {
    const select = modalRoot.querySelector("#sourceType");
    const field = modalRoot.querySelector(".other-source-field");
    const input = modalRoot.querySelector("#sourceCustomType");
    if (!select || !field || !input) return;
    const show = select.value === "other";
    field.classList.toggle("is-hidden", !show);
    input.required = show;
    if (!show) input.value = "";
  }

  function updateCommitmentCategoryField() {
    const select = modalRoot.querySelector("#commitmentCategory");
    const field = modalRoot.querySelector(".commitment-category-other");
    const input = modalRoot.querySelector("#commitmentCategoryOther");
    if (!select || !field || !input) return;
    const show = select.value === "other";
    field.classList.toggle("is-hidden", !show);
    input.required = show;
    if (!show) input.value = "";
  }

  function updateCommitmentProviderField() {
    const select = modalRoot.querySelector("#commitmentType");
    const field = modalRoot.querySelector(".commitment-provider-field");
    const input = modalRoot.querySelector("#provider");
    const titleField = modalRoot.querySelector(".commitment-title-field");
    if (!select || !field || !input) return;
    const show = select.value !== "expense";
    field.classList.toggle("is-hidden", !show);
    if (titleField) titleField.classList.toggle("is-wide", !show);
    input.required = show;
  }

  function updateWorkIncomeCurrencyField() {
    const sourceSelect = modalRoot.querySelector("#incomeSourceId");
    const currencySelect = modalRoot.querySelector("#incomeCurrency");
    if (!sourceSelect || !currencySelect) return;
    const option = sourceSelect.selectedOptions?.[0];
    const currency = option?.dataset?.currency;
    if (currency) currencySelect.value = currency;
  }

  function updateSubscriptionCardField() {
    const select = modalRoot.querySelector("#subscriptionPaymentMethod");
    const field = modalRoot.querySelector(".subscription-card-field");
    const cardSelect = modalRoot.querySelector("#subscriptionCardId");
    if (!select || !field || !cardSelect) return;
    const show = select.value === "card";
    field.classList.toggle("is-hidden", !show);
    cardSelect.required = show;
    if (!show) cardSelect.value = "";
  }

  function updateVehicleInsuranceCardField() {
    const select = modalRoot.querySelector("#vehicleInsurancePaymentType");
    const field = modalRoot.querySelector(".vehicle-insurance-card-field");
    const cardSelect = modalRoot.querySelector("#vehicleInsuranceCardId");
    if (!select || !field || !cardSelect) return;
    const show = select.value === "card";
    field.classList.toggle("is-hidden", !show);
    cardSelect.required = show;
    if (!show) cardSelect.value = "";
  }

  function updateSubscriptionCustomField() {
    const select = modalRoot.querySelector("#subscriptionServiceKey");
    const field = modalRoot.querySelector(".subscription-custom-field");
    const input = modalRoot.querySelector("#subscriptionCustomName");
    if (!select || !field || !input) return;
    const show = select.value === "other";
    field.classList.toggle("is-hidden", !show);
    input.required = show;
    if (!show) input.value = "";
  }

  function normalizeVehicleInsurancePaymentType(vehicle = {}) {
    const explicit = String(vehicle.insurancePaymentType || "").toLowerCase();
    if (["bank", "card", "cash"].includes(explicit)) return explicit;
    const legacy = String(vehicle.insurancePaymentMethod || "").toLowerCase();
    if (legacy.includes("cart") || legacy.includes("credit")) return "card";
    if (legacy.includes("dinheiro") || legacy.includes("cash")) return "cash";
    return "bank";
  }

  function splitVehicleModel(value) {
    const text = String(value || "").trim().replace(/\s+/g, " ");
    if (!text) return { brand: "", model: "" };
    const parts = text.split(" ");
    if (parts.length === 1) return { brand: "", model: text };
    return { brand: parts[0], model: parts.slice(1).join(" ") };
  }

  function vehicleBrand(vehicle = state.vehicle || {}) {
    return String(vehicle.brand || splitVehicleModel(vehicle.model).brand || "").trim();
  }

  function vehicleModelName(vehicle = state.vehicle || {}) {
    const parsed = splitVehicleModel(vehicle.model);
    return String(vehicle.brand ? vehicle.model || "" : parsed.model || vehicle.model || "").trim();
  }

  function vehicleInsurancePaymentLabel(type) {
    return {
      bank: "Conta/debito",
      card: "Cartao de credito",
      cash: "Dinheiro"
    }[type] || "Conta/debito";
  }

  function vehicleHasInsurance(vehicle = state.vehicle || {}) {
    return number(vehicle.insuranceAmount) > 0 || Boolean(String(vehicle.insuranceCompany || "").trim());
  }

  function vehicleMonthlyCosts(month) {
    const vehicle = state.vehicle || {};
    const items = [];
    const insuranceAmount = number(vehicle.insuranceAmount);
    const insurancePaymentType = normalizeVehicleInsurancePaymentType(vehicle);

    if (insuranceAmount && insurancePaymentType !== "card") {
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
        note: vehicle.insurancePaymentMethod || vehicleInsurancePaymentLabel(insurancePaymentType),
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
          category: sourceTypeLabel(source),
          amount: number(item.amount),
          currency: item.currency || source.currency || "JPY",
          date: item.date,
          note: "Pagamento recebido",
          color: source.color,
          icon: "+"
        };
      })
      : [];
    return [...txs, ...vehicle, ...incomes].sort((a, b) => b.date.localeCompare(a.date));
  }

  function categoryTotals(month, country) {
    const currency = country === "brasil" ? "BRL" : primaryCurrency();
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
    plannedSubscriptionEntries(month, country).forEach((item) => {
      const current = totals.get("Subscricao") || 0;
      totals.set("Subscricao", current + convert(item.amount, item.currency, currency, rate));
    });
    plannedHousingEntries(month, country).forEach((item) => {
      const current = totals.get("Moradia") || 0;
      totals.set("Moradia", current + convert(item.amount, item.currency, currency, rate));
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
    const liveRate = Number(state.fxQuotes?.jpyBrl || 0);
    if (liveRate > 0 && state.fxQuotes?.status === "ok") return liveRate;
    const previous = state.transfers
      .filter((item) => item.rate && (!month || item.date.slice(0, 7) <= month))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return previous ? Number(previous.rate) : Number(state.settings.defaultRate || 0.035);
  }

  function currentFxQuoteInfo() {
    const liveRate = Number(state.fxQuotes?.jpyBrl || 0);
    const rate = liveRate || latestRate(state.ui.selectedMonth);
    const usdBrl = Number(state.fxQuotes?.usdBrl || 0);
    const eurBrl = Number(state.fxQuotes?.eurBrl || 0);
    const source = liveRate ? state.fxQuotes?.source || "Mercado" : "Ultima Wise cadastrada";
    const updated = liveRate && state.fxQuotes?.updatedAt ? `Atualizada ${formatTime(state.fxQuotes.updatedAt)}` : "Sem cotacao online recente";
    return {
      jpyBrl: rate,
      brlJpy: rate ? 1 / rate : 0,
      usdBrl,
      brlUsd: usdBrl ? 1 / usdBrl : 0,
      eurBrl,
      brlEur: eurBrl ? 1 / eurBrl : 0,
      status: liveRate ? "Online" : "Fallback",
      tone: liveRate ? "green" : "gold",
      meta: `${source} - ${updated}. Transferencias Wise continuam salvando a cotacao real usada.`
    };
  }

  function summaryLine(summary) {
    const projected = formatMoney(summary.projectedBalance, summary.currency);
    if (!summary.plannedOutflow) return `Previsto ${projected} · nenhuma conta aberta`;
    return `Previsto ${projected} · aberto ${formatMoney(summary.plannedOutflow, summary.currency)}`;
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

  function isHousingItemPaid(housingId, itemKey, month) {
    return Boolean(state.paidCommitments[housingPaymentKey(housingId, itemKey, month)]);
  }

  function housingPaymentKey(housingId, itemKey, month) {
    return `${month}:housing:${housingId}:${itemKey}`;
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

  function primaryCurrency() {
    return sanitizeCurrency(state?.settings?.baseCurrency, PRIMARY_CURRENCY);
  }

  function secondaryCurrency() {
    return sanitizeSecondaryCurrency(state?.settings?.secondaryCurrency, primaryCurrency());
  }

  function sanitizeCurrency(currency, fallback = PRIMARY_CURRENCY) {
    return supportedCurrencies[currency] ? currency : fallback;
  }

  function sanitizeSecondaryCurrency(currency, primary) {
    const safe = sanitizeCurrency(currency, primary === DEFAULT_SECONDARY_CURRENCY ? "USD" : DEFAULT_SECONDARY_CURRENCY);
    if (safe !== primary) return safe;
    return Object.keys(supportedCurrencies).find((item) => item !== primary) || DEFAULT_SECONDARY_CURRENCY;
  }

  function currencyOptions(selected) {
    const safeSelected = sanitizeCurrency(selected, PRIMARY_CURRENCY);
    return Object.entries(supportedCurrencies)
      .map(([code, meta]) => `<option value="${code}" ${selectedAttr(code, safeSelected)}>${meta.label}</option>`)
      .join("");
  }

  function convert(amount, from, to, rate) {
    const value = Number(amount || 0);
    const source = sanitizeCurrency(from, primaryCurrency());
    const target = sanitizeCurrency(to, primaryCurrency());
    if (source === target) return value;

    const sourcePerUsd = currencyPerUsd(source, rate);
    const targetPerUsd = currencyPerUsd(target, rate);
    if (sourcePerUsd && targetPerUsd) return (value / sourcePerUsd) * targetPerUsd;

    if (source === "BRL" && target === "JPY") return value / rate;
    if (source === "JPY" && target === "BRL") return value * rate;
    return value;
  }

  function currencyPerUsd(currency, rate = latestRate()) {
    const quotes = state.fxQuotes || {};
    const usdBrl = Number(quotes.usdBrl || 0);
    const usdJpy = Number(quotes.usdJpy || (usdBrl && rate ? usdBrl / rate : 0));
    const usdEur = Number(quotes.usdEur || 0);
    if (currency === "USD") return 1;
    if (currency === "BRL") return usdBrl || 5.5;
    if (currency === "JPY") return usdJpy || ((usdBrl || 5.5) / (rate || 0.035));
    if (currency === "EUR") return usdEur || 0.92;
    return 0;
  }

  function formatMoneyWithPrimary(value, currency, month = state.ui.selectedMonth) {
    const originalCurrency = sanitizeCurrency(currency, primaryCurrency());
    const original = formatMoney(value, originalCurrency);
    const comparisonCurrency = originalCurrency === primaryCurrency() ? secondaryCurrency() : primaryCurrency();
    if (!comparisonCurrency || comparisonCurrency === originalCurrency) return original;
    const converted = convert(value, originalCurrency, comparisonCurrency, latestRate(month));
    return `${original} <small class="money-converted">(${formatMoney(converted, comparisonCurrency)})</small>`;
  }

  function formatMoney(value, currency) {
    const meta = supportedCurrencies[sanitizeCurrency(currency, primaryCurrency())] || supportedCurrencies.JPY;
    const amount = Number(value || 0);
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: sanitizeCurrency(currency, primaryCurrency()),
      maximumFractionDigits: meta.fraction,
      minimumFractionDigits: meta.fraction
    }).format(amount);
  }

  function formatSignedMoney(value, currency) {
    const amount = Number(value || 0);
    const sign = amount >= 0 ? "+" : "-";
    return `${sign} ${formatMoney(Math.abs(amount), currency)}`;
  }

  function formatCryptoInvestedSummary(summary) {
    const totals = summary.originalCosts || [];
    const currentPrimary = primaryCurrency();
    const nonPrimary = totals.filter((item) => item.currency !== currentPrimary && item.amount > 0);
    const primary = totals.find((item) => item.currency === currentPrimary);

    if (nonPrimary.length === 1 && (!primary || !primary.amount)) {
      const item = nonPrimary[0];
      return `${formatMoney(item.amount, item.currency)} <small class="money-converted">(${formatMoney(summary.totalCost, currentPrimary)})</small>`;
    }

    if (!nonPrimary.length) return formatMoneyWithPrimary(summary.totalCost, currentPrimary);

    const detail = nonPrimary
      .map((item) => formatMoney(item.amount, item.currency))
      .join(" + ");
    return `${formatMoney(summary.totalCost, currentPrimary)} <small class="money-converted">${detail}</small>`;
  }

  function formatCryptoAmount(value) {
    const amount = cryptoQuantityNumber(value);
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 8,
      minimumFractionDigits: 0
    }).format(amount);
  }

  function formatCryptoInputValue(value) {
    const amount = cryptoQuantityNumber(value);
    if (!amount) return "";
    return amount.toLocaleString("en-US", {
      maximumFractionDigits: 12,
      useGrouping: false
    });
  }

  function formatPlainNumber(value) {
    const amount = Number(value || 0);
    if (!amount) return "";
    return amount.toLocaleString("en-US", {
      maximumFractionDigits: 8,
      useGrouping: false
    });
  }

  function formatPercent(value) {
    const amount = Number(value || 0);
    const digits = Math.abs(amount) < 1 && amount !== 0 ? 4 : 2;
    return `${new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0
    }).format(amount)}%`;
  }

  function formatCompact(value, currency) {
    const amount = Number(value || 0);
    const safeCurrency = sanitizeCurrency(currency, primaryCurrency());
    const meta = supportedCurrencies[safeCurrency] || supportedCurrencies.JPY;
    return new Intl.NumberFormat(meta.locale, {
      notation: "compact",
      maximumFractionDigits: meta.fraction ? 1 : 0
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

  function formatYenPerReal(value) {
    return `${formatYenRate(value)} / R$1`;
  }

  function formatUsdPerReal(value) {
    return `R$ ${Number(value || 0).toFixed(4)} / US$1`;
  }

  function formatEuroPerReal(value) {
    return `R$ ${Number(value || 0).toFixed(4)} / €1`;
  }

  function formatUsdRate(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function memberInitials(member) {
    const source = member.displayName || member.email || "Membro";
    const parts = String(source).replace(/@.*/, "").split(/\s+/).filter(Boolean);
    const letters = parts.length > 1
      ? `${parts[0][0] || ""}${parts[1][0] || ""}`
      : String(parts[0] || "M").slice(0, 2);
    return letters.toUpperCase();
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

  function formatShortDate(value) {
    if (!value) return "--";
    const text = String(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(text);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
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

  function normalizeLookupText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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
      subscription: "subscriptions",
      crypto: "cryptoAssets",
      housingCard: "housingCards",
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

  function cryptoQuantityNumber(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    const negative = raw.startsWith("-");
    let text = raw.replace(/[^\d,.]/g, "");
    if (!text) return 0;

    const commaIndex = text.lastIndexOf(",");
    const dotIndex = text.lastIndexOf(".");
    if (commaIndex !== -1 && dotIndex !== -1) {
      const decimalSeparator = commaIndex > dotIndex ? "," : ".";
      const groupSeparator = decimalSeparator === "," ? "." : ",";
      text = text.replaceAll(groupSeparator, "");
      if (decimalSeparator === ",") text = text.replace(",", ".");
    } else if (commaIndex !== -1) {
      text = text.replace(",", ".");
    }

    const firstDot = text.indexOf(".");
    if (firstDot !== -1) {
      text = `${text.slice(0, firstDot + 1)}${text.slice(firstDot + 1).replaceAll(".", "")}`;
    }

    const parsed = Number(`${negative ? "-" : ""}${text}`);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function cryptoQuantityText(value) {
    const amount = cryptoQuantityNumber(value);
    if (!amount) return "0";
    return amount.toLocaleString("en-US", {
      maximumFractionDigits: 12,
      useGrouping: false
    });
  }

  function normalizeCryptoQuantityText(itemOrValue, quotes = state?.cryptoQuotes) {
    if (!itemOrValue || typeof itemOrValue !== "object") return cryptoQuantityText(itemOrValue);
    let amount = cryptoQuantityNumber(itemOrValue.quantity);
    const symbol = String(itemOrValue.symbol || "BTC").toUpperCase();
    const expected = expectedCryptoQuantity(itemOrValue, symbol, quotes);
    if (symbol === "BTC" && expected > 0 && amount > expected * 5) {
      amount = closestScaledCryptoQuantity(amount, expected);
    }
    return cryptoQuantityText(amount);
  }

  function expectedCryptoQuantity(item, symbol, quotes) {
    const costAmount = number(item.costAmount);
    const costCurrency = item.costCurrency || PRIMARY_CURRENCY;
    if (!costAmount) return 0;
    const price = Number(quotes?.prices?.[symbol]?.[costCurrency] || fallbackCryptoPrice(symbol, costCurrency));
    return price > 0 ? costAmount / price : 0;
  }

  function fallbackCryptoPrice(symbol, currency) {
    if (symbol !== "BTC") return 0;
    if (currency === "BRL") return 350000;
    if (currency === "JPY") return 10000000;
    if (currency === "USD") return 65000;
    return 0;
  }

  function closestScaledCryptoQuantity(amount, expected) {
    let best = amount;
    let bestScore = cryptoScaleScore(amount, expected);
    for (let divisor = 10; divisor <= 10000000000; divisor *= 10) {
      const candidate = amount / divisor;
      const score = cryptoScaleScore(candidate, expected);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  function cryptoScaleScore(value, expected) {
    if (value <= 0 || expected <= 0) return Number.POSITIVE_INFINITY;
    return Math.abs(Math.log(value / expected));
  }

  function number(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    let text = raw.replace(/[^\d,.\-]/g, "");
    const hasComma = text.includes(",");
    const hasDot = text.includes(".");

    if (hasComma && hasDot) {
      text = text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replaceAll(".", "").replace(",", ".")
        : text.replaceAll(",", "");
    } else if (hasComma) {
      const parts = text.split(",");
      const decimalLike = parts.length === 2 && (parts[1].length !== 3 || /^-?0$/.test(parts[0]));
      text = decimalLike ? `${parts[0]}.${parts[1]}` : text.replaceAll(",", "");
    } else if (hasDot) {
      const parts = text.split(".");
      if (parts.length > 2) text = parts.join("");
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
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
