(function () {
  "use strict";

  const STORAGE_KEY = "nekuma-ai-session-v1";
  const MAX_MESSAGES = 12;
  let options = null;
  let messages = loadMessages();
  let sending = false;

  const launcher = document.getElementById("nekuma-ai-button");
  const root = document.getElementById("ai-root");
  if (!launcher || !root) return;

  launcher.addEventListener("click", open);
  root.addEventListener("click", (event) => {
    if (event.target.matches("[data-ai-close]")) close();
    const suggestion = event.target.closest("[data-ai-suggestion]");
    if (suggestion && !sending) submitQuestion(suggestion.dataset.aiSuggestion || "");
    const clear = event.target.closest("[data-ai-clear]");
    if (clear && !sending) {
      messages = [];
      saveMessages();
      render();
    }
  });
  root.addEventListener("submit", (event) => {
    if (!event.target.matches("[data-ai-form]")) return;
    event.preventDefault();
    const field = event.target.elements.message;
    submitQuestion(field.value);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("is-open")) close();
  });

  window.NekumaAI = {
    mount(nextOptions) {
      options = nextOptions || options;
      launcher.hidden = !options;
    },
    clear() {
      options = null;
      close();
      launcher.hidden = true;
    }
  };

  function open() {
    if (!options) return;
    render();
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("ai-panel-open");
    requestAnimationFrame(() => root.querySelector("textarea")?.focus());
  }

  function close() {
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ai-panel-open");
    launcher.focus({ preventScroll: true });
  }

  function render() {
    root.innerHTML = `
      <div class="ai-backdrop" data-ai-close></div>
      <aside class="ai-drawer" role="dialog" aria-modal="true" aria-labelledby="ai-title">
        <header class="ai-drawer-head">
          <div class="ai-brand-mark"><i data-lucide="sparkles" aria-hidden="true"></i></div>
          <div>
            <span class="ai-kicker">Copiloto financeiro</span>
            <h2 id="ai-title">Nekuma IA</h2>
          </div>
          <button class="icon-button ai-close" type="button" data-ai-close aria-label="Fechar Nekuma IA" title="Fechar">
            <i data-lucide="x" aria-hidden="true"></i>
          </button>
        </header>
        <div class="ai-privacy-note"><i data-lucide="shield-check" aria-hidden="true"></i> Somente leitura. Nenhum pagamento ou alteração será realizado.</div>
        <div class="ai-conversation" data-ai-conversation>
          ${messages.length ? messages.map(renderMessage).join("") : renderWelcome()}
          ${sending ? `<div class="ai-message is-assistant is-loading"><span></span><span></span><span></span><em>Analisando seus dados...</em></div>` : ""}
        </div>
        ${messages.length ? `<button class="ai-clear" type="button" data-ai-clear ${sending ? "disabled" : ""}><i data-lucide="trash-2" aria-hidden="true"></i> Limpar conversa</button>` : ""}
        <form class="ai-composer" data-ai-form>
          <label class="sr-only" for="ai-message">Pergunte sobre suas finanças</label>
          <textarea id="ai-message" name="message" maxlength="800" rows="1" placeholder="Pergunte sobre seu mês..." ${sending ? "disabled" : ""}></textarea>
          <button type="submit" aria-label="Enviar pergunta" title="Enviar" ${sending ? "disabled" : ""}>
            <i data-lucide="arrow-up" aria-hidden="true"></i>
          </button>
        </form>
        <p class="ai-disclaimer">Estimativas podem conter imprecisões. Confirme valores antes de tomar decisões financeiras.</p>
      </aside>
    `;
    options?.icons?.();
    const conversation = root.querySelector("[data-ai-conversation]");
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }

  function renderWelcome() {
    const suggestions = [
      "Como estão minhas finanças neste mês?",
      "Quais contas ainda preciso pagar?",
      "Quanto posso guardar sem comprometer o mês?",
      "Analise minha reserva de emergência."
    ];
    return `
      <section class="ai-welcome">
        <div class="ai-welcome-icon"><i data-lucide="bar-chart-3" aria-hidden="true"></i></div>
        <h3>O que vamos analisar?</h3>
        <p>Eu uso o mês selecionado no Nekuma para explicar saldos, despesas, contas abertas e metas.</p>
        <div class="ai-suggestions">
          ${suggestions.map((text) => `<button type="button" data-ai-suggestion="${escapeAttr(text)}">${escapeHtml(text)}</button>`).join("")}
        </div>
      </section>
    `;
  }

  function renderMessage(message) {
    return `<div class="ai-message is-${message.role === "user" ? "user" : "assistant"}"><span>${escapeHtml(message.text)}</span></div>`;
  }

  async function submitQuestion(rawQuestion) {
    const question = String(rawQuestion || "").trim().slice(0, 800);
    if (!question || sending || !options) return;
    const history = messages.slice(-6);
    messages.push({ role: "user", text: question });
    messages = messages.slice(-MAX_MESSAGES);
    sending = true;
    saveMessages();
    render();

    try {
      const token = await options.token?.();
      if (!token) throw new Error("Sua sessão expirou. Entre novamente no Nekuma.");
      const context = await options.context?.();
      const response = await fetch("./api/ai", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: question, history, context }),
        signal: AbortSignal.timeout(45000)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "A Nekuma IA está indisponível agora.");
      messages.push({ role: "assistant", text: String(payload.answer || "Não consegui gerar uma resposta.") });
    } catch (error) {
      const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
      messages.push({
        role: "assistant",
        text: timedOut ? "A análise demorou mais que o esperado. Tente novamente em alguns instantes." : (error.message || "Não consegui concluir a análise.")
      });
    } finally {
      messages = messages.slice(-MAX_MESSAGES);
      sending = false;
      saveMessages();
      render();
      root.querySelector("textarea")?.focus();
    }
  }

  function loadMessages() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter(validMessage).slice(-MAX_MESSAGES) : [];
    } catch {
      return [];
    }
  }

  function saveMessages() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }

  function validMessage(message) {
    return message && ["user", "assistant"].includes(message.role) && typeof message.text === "string";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
