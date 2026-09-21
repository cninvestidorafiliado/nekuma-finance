(function () {
  "use strict";

  const TOPICS = [
    {
      id: "bank-accounts",
      title: "Contas bancárias",
      keywords: ["conta bancaria", "banco", "saldo", "conta principal", "ordenar contas"],
      answer: "Para cadastrar uma conta, abra Contas e toque em Nova conta. Informe país, moeda, banco, tipo e saldo inicial. Depois, use os três riscos do card para ordenar as contas; a primeira será exibida como principal na tela inicial. Contas a pagar e Pago no mês acompanham somente a conta selecionada."
    },
    {
      id: "salary",
      title: "Salário previsto",
      keywords: ["salario previsto", "empresa", "teiji", "zangyou", "hora extra", "adicional noturno", "holerite"],
      answer: "Cadastre a empresa em Ajustes e preencha valor por hora, escala, turnos, adicionais, descontos e dia de pagamento. O card Salário previsto mostra bruto menos descontos e o líquido estimado. Ao receber, use Recebi para confirmar ou corrigir o valor antes de lançá-lo na conta bancária vinculada."
    },
    {
      id: "housing",
      title: "Moradia",
      keywords: ["moradia", "aluguel", "estacionamento", "agua", "luz", "gas", "internet", "descontado no salario"],
      answer: "Abra Contas, localize Moradia e toque em Nova moradia ou Editar. Você pode cadastrar aluguel, estacionamento, água, luz, gás, internet e outros itens. Quando a forma de pagamento for Empresa, o item será quitado junto com o recebimento do salário; marque Conta fixa quando ele deve se repetir mensalmente."
    },
    {
      id: "credit-cards",
      title: "Cartões",
      keywords: ["cartao", "cartao de credito", "fatura", "vencimento", "fechamento", "pagar fatura"],
      answer: "Em Contas, toque em Novo no card Meus Cartões. Cadastre bandeira, emissor, país, moeda, fechamento, vencimento e forma de pagamento da fatura. As compras entram na fatura do período correto; ao pagar, o Nekuma registra a despesa e desconta da conta bancária vinculada quando aplicável."
    },
    {
      id: "expenses",
      title: "Despesas e contas fixas",
      keywords: ["despesa", "gasto rapido", "conta fixa", "lancamento", "compra", "mercado", "farmacia"],
      answer: "Use o botão + da navegação para registrar um Gasto rápido ou Lançamento avulso. Escolha categoria, valor, moeda, vencimento e forma de pagamento. Marque Conta fixa somente quando a cobrança deve reaparecer nos meses seguintes; uma compra comum permanece apenas no mês cadastrado."
    },
    {
      id: "subscriptions",
      title: "Subscrições",
      keywords: ["subscricao", "assinatura", "streaming", "plano celular", "recorrente"],
      answer: "No card Subscrições atuais, toque em +. Informe serviço, valor, vencimento e forma de pagamento. Use recorrência para assinaturas mensais, como streaming, internet ou plano de celular. O pagamento alimenta Pago no mês, Últimos lançamentos e os gráficos da conta correspondente."
    },
    {
      id: "payments",
      title: "Pagamentos",
      keywords: ["pagar conta", "marcar como pago", "pago no mes", "contas a pagar", "ultimos lancamentos", "calendario financeiro"],
      answer: "Uma cobrança aberta aparece em Contas a pagar e no Calendário financeiro. Ao tocar em Pagar, confirme a forma de pagamento. Depois ela sai das pendências e entra em Pago no mês, Últimos lançamentos e Despesas e aportes, sempre vinculada à conta ou ao cartão escolhido."
    },
    {
      id: "goals",
      title: "Metas e reserva",
      keywords: ["meta financeira", "reserva de emergencia", "aporte", "guardar dinheiro", "progresso da reserva"],
      answer: "Em Metas Financeiras, crie uma meta ou use Reserva de emergência. Defina moeda, valor desejado, valor já guardado e aporte mensal. Use Aporte sempre que guardar dinheiro; o progresso, o valor restante e a previsão de conclusão serão atualizados pelo próprio Nekuma."
    },
    {
      id: "nubank-boxes",
      title: "Caixinhas Nubank",
      keywords: ["caixinha", "nubank", "cdi", "rendimento", "imposto de renda"],
      answer: "O card Caixinhas é liberado quando existe uma conta Nubank cadastrada. Informe nome, percentual do CDI, saldo atual, data-base e meta. Os rendimentos e impostos exibidos são estimativas diárias; use Atualizar CDI e registre novos aportes para manter a projeção próxima do saldo oficial do Nubank."
    },
    {
      id: "consortium",
      title: "Consórcio",
      keywords: ["consorcio", "grupo", "cota", "parcela", "carta de credito", "bem atualizado"],
      answer: "Cadastre o consórcio na área de Investimentos com grupo, cota, prazos, carta atualizada, parcelas pagas, composição e vencimento. Ao pagar uma parcela, o número pago aumenta e o restante diminui. O percentual usa o valor efetivamente amortizado da carta, não apenas a quantidade de parcelas."
    },
    {
      id: "crypto",
      title: "Criptomoedas",
      keywords: ["cripto", "metamask", "binance", "token", "carteira web3", "conectar carteira"],
      answer: "Na aba Cripto, conecte a MetaMask para consultar carteiras EVM ou a Binance com uma chave HMAC estritamente de leitura. O Nekuma mostra quantidades e valores sem poder movimentar ativos. Criptos que não estiverem conectadas também podem ser cadastradas manualmente. Nunca habilite saque ou negociação em uma chave usada pelo app."
    },
    {
      id: "family",
      title: "Família",
      keywords: ["familia", "membro", "pessoa", "compartilhar", "vinculo familiar"],
      answer: "No card Família, toque em Pessoa para cadastrar os membros. Depois, vincule despesas e objetivos ao membro correspondente. Contas comuns podem formar o resumo familiar, enquanto logins sem vínculo permanecem isolados e não recebem os dados uns dos outros."
    },
    {
      id: "dashboard",
      title: "Dashboard",
      keywords: ["dashboard", "mover card", "organizar card", "coluna", "tela inicial", "tres riscos"],
      answer: "No computador, os cards são organizados nas colunas Trabalho e Família, Investimentos e Gráficos. Arraste pelo ícone de três riscos para mudar a ordem dentro do grupo permitido. No celular, os cards permanecem em uma coluna para preservar leitura e alinhamento."
    },
    {
      id: "installation",
      title: "Instalação e acesso",
      keywords: ["instalar app", "pwa", "tela inicial", "login", "landing page", "icone no celular"],
      answer: "Abra a tela de login do Nekuma no navegador e use Instalar aplicativo. No iPhone, também é possível usar Compartilhar > Adicionar à Tela de Início. O ícone instalado abre diretamente o fluxo de login e mantém a sessão enquanto ela continuar válida."
    },
    {
      id: "privacy",
      title: "Privacidade da IA",
      keywords: ["privacidade", "ia", "qwen", "dados financeiros", "seguranca", "agente"],
      answer: "A Nekuma IA opera em modo somente leitura. As dúvidas de uso são respondidas localmente e não consomem cota. Nas análises pessoais, o servidor envia ao Qwen apenas um resumo estruturado do mês, sem senhas, chaves da Binance ou autorização para realizar pagamentos e movimentações."
    }
  ];

  const HELP_WORDS = ["como", "onde", "ensina", "ajuda", "usar", "utilizar", "cadastrar", "adicionar", "configurar", "conectar", "editar", "excluir", "funciona", "serve", "instalar"];
  const PERSONAL_ANALYSIS = ["como estao minhas financas", "como esta minha reserva", "resumo do mes", "situacao financeira", "balanco do mes", "quanto gastei", "quanto posso", "quanto guardar", "minhas contas", "contas abertas", "contas a pagar", "preciso pagar", "meu saldo", "meus saldos", "minha renda", "meu salario", "minha reserva", "este mes", "mes passado", "estou gastando", "meus gastos"];

  function answer(question) {
    const normalized = normalize(question);
    if (!normalized || PERSONAL_ANALYSIS.some((phrase) => normalized.includes(phrase))) return null;
    const helpIntent = HELP_WORDS.some((word) => hasTerm(normalized, word));
    const ranked = TOPICS.map((topic) => ({ topic, score: scoreTopic(normalized, topic) }))
      .sort((a, b) => b.score - a.score);
    if (ranked[0]?.score >= (helpIntent ? 2 : 4)) {
      return { topic: ranked[0].topic.title, text: ranked[0].topic.answer };
    }
    if (!helpIntent) return null;
    return {
      topic: "Ajuda do aplicativo",
      text: "Posso ensinar a usar contas bancárias, salário, moradia, cartões, pagamentos, metas, Caixinhas, consórcios, criptomoedas, família e o dashboard. Diga qual área do Nekuma você quer aprender."
    };
  }

  function financialAnswer(question, context) {
    if (!context || typeof context !== "object") return null;
    const normalized = normalize(question);
    const currency = String(context.baseCurrency || "JPY");
    const overview = context.overview || {};
    const reserve = context.emergencyReserve || {};

    if (includesAny(normalized, ["como estao minhas financas", "resumo do mes", "situacao financeira", "balanco do mes"])) {
      const entered = money(overview.actualInflow, currency);
      const spent = money(overview.actualOutflow, currency);
      const current = finite(overview.currentDifference);
      const projected = finite(overview.projectedDifference);
      return `No mês selecionado, entrou ${entered} e saiu ${spent}. O saldo realizado está em ${money(current, currency)}. Considerando os valores previstos, o mês deve terminar em ${money(projected, currency)}${projected < 0 ? ". A projeção está negativa; revise as contas abertas antes de assumir novos compromissos." : "."}`;
    }

    if (includesAny(normalized, ["contas em aberto", "contas abertas", "contas a pagar", "preciso pagar", "falta pagar", "vencimentos"])) {
      const items = Array.isArray(context.openItems) ? context.openItems : [];
      if (!items.length) return "Não encontrei contas em aberto no mês selecionado.";
      const lines = items.slice(0, 8).map((item) => `- ${item.title}: ${money(item.amount, item.currency || currency)}${item.date ? `, vencimento ${formatDate(item.date)}` : ""}`);
      const extra = items.length > lines.length ? `\nE mais ${items.length - lines.length} conta(s) no Calendário financeiro.` : "";
      return `Você possui ${items.length} conta(s) em aberto:\n${lines.join("\n")}${extra}`;
    }

    if (includesAny(normalized, ["quanto posso guardar", "quanto guardar", "posso economizar", "valor para reserva", "aporte para reserva"])) {
      const income = finite(overview.projectedInflow);
      const available = Math.max(0, finite(overview.projectedDifference, income - finite(overview.projectedOutflow)));
      if (!income) return "Ainda não existe renda prevista suficiente para calcular uma sugestão. Cadastre o salário ou outra entrada do mês.";
      const scenarios = [5, 10, 20].map((percent) => `${percent}% = ${money(income * percent / 100, currency)}`).join("; ");
      const suggested = finite(reserve.suggestedMonthlyContribution);
      return `Depois das despesas previstas, a disponibilidade estimada é ${money(available, currency)}. Cenários sobre a renda: ${scenarios}.${suggested > 0 ? ` Para a reserva cadastrada, o aporte atual sugerido é ${money(Math.min(suggested, available), currency)} sem ultrapassar essa disponibilidade.` : ""} Isto é uma simulação; mantenha margem para imprevistos.`;
    }

    if (includesAny(normalized, ["minha reserva", "reserva de emergencia", "progresso da reserva", "completar a reserva"])) {
      const target = finite(reserve.target);
      if (!target) return "Você ainda não definiu uma meta para a reserva de emergência. Crie ou edite a reserva na coluna Investimentos.";
      const saved = finite(reserve.saved);
      const remaining = Math.max(0, finite(reserve.remaining, target - saved));
      const percent = target ? Math.min(100, saved / target * 100) : 0;
      const months = Math.max(0, Math.round(finite(reserve.estimatedMonthsToGoal)));
      return `Sua reserva está em ${money(saved, currency)} de ${money(target, currency)} (${percent.toFixed(1).replace(".", ",")}% concluída). Faltam ${money(remaining, currency)}.${months ? ` Mantendo o aporte atual, a estimativa é de aproximadamente ${months} mês(es).` : ""}`;
    }

    if (includesAny(normalized, ["quanto gastei", "meus gastos", "gastos do mes", "maior gasto", "gastei mais"])) {
      const categories = Array.isArray(context.spendingByCategory) ? context.spendingByCategory : [];
      const top = categories.slice(0, 5).map((item) => `- ${item.category}: ${money(item.amount, item.currency || currency)}`);
      return `Seus gastos realizados no mês somam ${money(overview.actualOutflow, currency)}.${top.length ? `\nMaiores categorias:\n${top.join("\n")}` : " Ainda não há categorias com valores registrados."}`;
    }

    if (includesAny(normalized, ["saldo das contas", "meus saldos", "saldo bancario", "quanto tenho nas contas"])) {
      const accounts = Array.isArray(context.accounts) ? context.accounts : [];
      if (!accounts.length) return "Você ainda não possui contas bancárias cadastradas.";
      return `Saldos cadastrados:\n${accounts.map((account) => `- ${account.name}: ${money(account.balance, account.currency || currency)}`).join("\n")}`;
    }

    return null;
  }

  function scoreTopic(question, topic) {
    return topic.keywords.reduce((score, keyword) => score + (hasTerm(question, keyword) ? (keyword.includes(" ") ? 3 : 2) : 0), 0);
  }

  function hasTerm(text, term) {
    return (` ${text} `).includes(` ${term} `) || (term.includes(" ") && text.includes(term));
  }

  function includesAny(text, phrases) {
    return phrases.some((phrase) => text.includes(phrase));
  }

  function finite(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function money(value, currency) {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: currency === "JPY" ? 0 : 2 }).format(finite(value));
    } catch {
      return `${currency} ${finite(value).toFixed(2)}`;
    }
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}` : String(value || "");
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9%]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  window.NekumaHelp = {
    answer,
    financialAnswer,
    suggestions: [
      "Como cadastro uma conta fixa?",
      "Como funciona o salário previsto?"
    ],
    topics: TOPICS.map(({ id, title }) => ({ id, title }))
  };
})();
