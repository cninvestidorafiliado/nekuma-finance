(function () {
  'use strict';
  const cardClasses = ['overview-card', 'paypal-panel', 'dashboard-cards-panel', 'housing-panel', 'vehicle-panel', 'subscriptions-panel', 'financial-calendar-panel', 'work-calendar-panel', 'family-pie-panel', 'dashboard-trend-panel', 'emergency-reserve-panel', 'crypto-panel', 'goals-panel', 'debt-home-panel', 'family-tools-panel', 'family-panel', 'expenses-brasil', 'expenses-japao', 'recent-transactions-panel'];
  let sortables = [];
  let dragging = false;
  let pinned = {};
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = (value, currency) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2 }).format(value);

  function expenses(models, monthLabel) {
    return models.map(model => {
      let cursor = 0;
      const sectors = model.categories.map(item => {
        const percent = item.amount / model.total * 100;
        const offset = cursor;
        cursor += percent;
        return `<circle class="expense-sector" data-category="${escape(item.key)}" cx="100" cy="100" r="72" pathLength="100" fill="none" stroke="${item.color}" stroke-width="24" stroke-dasharray="${Math.max(0.05, percent - 0.7)} ${100 - Math.max(0.05, percent - 0.7)}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)" tabindex="0" role="button" aria-pressed="false" aria-label="${escape(item.label)}: ${escape(money(item.amount, model.currency))}, ${percent.toFixed(1)}%"><title>${escape(item.label)}</title></circle>`;
      }).join('');
      return `<article class="content-panel country-expenses-panel expenses-${model.country}" data-expense-country="${model.country}">
        <div class="panel-head"><div><h2>Despesas e aportes</h2><p class="row-meta">${escape(monthLabel)} · Registrados e previstos</p></div><span class="chip blue">${model.country === 'brasil' ? 'BRASIL' : 'JAPÃO'}</span></div>
        <div class="country-expenses-body">
          <div class="expense-donut"><svg viewBox="0 0 200 200" aria-label="Despesas por categoria"><circle cx="100" cy="100" r="72" fill="none" stroke="#e5eae7" stroke-width="24"/>${sectors}</svg><div class="expense-donut-total"><span>Total do mês</span><strong>${escape(money(model.total, model.currency))}</strong></div></div>
          <div class="expense-legend">${model.categories.map(item => `<button type="button" class="expense-legend-row" data-category="${escape(item.key)}" aria-pressed="false" style="--category-color:${item.color}"><i></i><span><strong>${escape(item.label)}</strong><small>${(item.amount / model.total * 100).toFixed(1).replace('.', ',')}% · ${escape(money(item.amount, model.currency))}</small>${item.banks.map(bank => `<small class="expense-bank">${escape(bank.name)} · ${escape(money(bank.amount, model.currency))}</small>`).join('')}</span></button>`).join('') || '<p class="empty-state">Nenhuma despesa registrada ou prevista neste mês.</p>'}</div>
        </div>
        ${(model.pendingCountry || []).map(item => `<button class="small-action ghost" type="button" data-action="open-modal" data-modal="crypto" data-id="${escape(item.id)}">Definir país: ${escape(item.name)}</button>`).join('')}
      </article>`;
    }).join('');
  }

  function highlight(panel, key) {
    panel.classList.toggle('has-expense-selection', Boolean(key));
    panel.querySelectorAll('[data-category]').forEach(node => {
      const active = node.dataset.category === key;
      node.classList.toggle('is-selected', active);
      node.setAttribute('aria-pressed', String(active));
    });
  }

  function charts(root, month) {
    root.querySelectorAll('[data-expense-country]').forEach(panel => {
      const id = `${month}:${panel.dataset.expenseCountry}`;
      const select = event => {
        const item = event.target.closest('[data-category]');
        if (!item) return;
        pinned[id] = pinned[id] === item.dataset.category ? '' : item.dataset.category;
        highlight(panel, pinned[id]);
      };
      panel.addEventListener('click', select);
      panel.addEventListener('keydown', event => {
        if (event.target.matches('.expense-sector') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); select(event); }
      });
      panel.addEventListener('pointerover', event => {
        const item = event.target.closest('[data-category]');
        if (item && event.pointerType !== 'touch') highlight(panel, item.dataset.category);
      });
      panel.addEventListener('pointerleave', () => highlight(panel, pinned[id]));
      panel.addEventListener('focusin', event => {
        const item = event.target.closest('[data-category]');
        if (item) highlight(panel, item.dataset.category);
      });
      panel.addEventListener('focusout', event => { if (!panel.contains(event.relatedTarget)) highlight(panel, pinned[id]); });
      highlight(panel, pinned[id]);
    });
  }

  function setup(root, layouts, save, month) {
    sortables.forEach(sortable => sortable.destroy());
    sortables = [];
    const shell = root.querySelector('.desktop-dashboard-shell');
    if (!shell) return;
    shell.classList.add('dashboard-organizable');
    shell.querySelectorAll('.dashboard-card-vehicle-grid').forEach(wrapper => wrapper.replaceWith(...wrapper.children));
    const zones = [...shell.querySelectorAll('.desktop-dashboard-column')];
    const cards = new Map();
    zones.forEach((zone, column) => {
      zone.dataset.dashboardColumn = column;
      [...zone.children].forEach(card => {
        const key = cardClasses.find(name => card.classList.contains(name));
        if (!key) return;
        card.dataset.dashboardCard = key;
        card.style.order = '0';
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = 'dashboard-handle';
        handle.title = 'Mover card';
        handle.setAttribute('aria-label', `Mover ${card.querySelector('h2')?.textContent || 'Resumo'}`);
        handle.innerHTML = '<i data-lucide="menu" aria-hidden="true"></i>';
        card.prepend(handle);
        cards.set(key, card);
      });
    });
    const mobile = window.matchMedia('(max-width: 759px)').matches;
    const mode = mobile ? 'mobile' : 'desktop';
    let targets = zones;
    if (mobile) {
      const zone = document.createElement('div');
      zone.className = 'dashboard-mobile-zone';
      shell.append(zone);
      const order = [...(Array.isArray(layouts.mobile) ? layouts.mobile : []), ...cardClasses];
      new Set(order).forEach(key => { if (cards.has(key)) zone.append(cards.get(key)); });
      zones.forEach(column => column.remove());
      targets = [zone];
    } else if (Array.isArray(layouts.desktop)) {
      const placed = new Set();
      layouts.desktop.slice(0, 3).forEach((keys, column) => {
        if (!Array.isArray(keys)) return;
        keys.forEach(key => { if (cards.has(key) && !placed.has(key)) { zones[column].append(cards.get(key)); placed.add(key); } });
      });
    }
    const remember = () => {
      const orders = targets.map(zone => [...zone.children].filter(card => card.dataset.dashboardCard).map(card => card.dataset.dashboardCard));
      save({ ...layouts, [mode]: mobile ? orders[0] : orders });
    };
    targets.forEach(zone => {
      if (!window.Sortable) return;
      sortables.push(new window.Sortable(zone, {
        group: 'dashboard', draggable: '[data-dashboard-card]', handle: '.dashboard-handle',
        animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180,
        ghostClass: 'dashboard-drop-placeholder', chosenClass: 'dashboard-drag-chosen',
        forceFallback: true, fallbackOnBody: true, fallbackTolerance: 5, emptyInsertThreshold: 40,
        onStart() { dragging = true; document.body.classList.add('dashboard-dragging'); },
        onEnd() { dragging = false; document.body.classList.remove('dashboard-dragging'); remember(); }
      }));
      zone.addEventListener('keydown', event => {
        if (!event.target.closest('.dashboard-handle') || !event.key.startsWith('Arrow')) return;
        const card = event.target.closest('[data-dashboard-card]');
        event.preventDefault();
        if (event.key === 'ArrowUp' && card.previousElementSibling) zone.insertBefore(card, card.previousElementSibling);
        if (event.key === 'ArrowDown' && card.nextElementSibling) zone.insertBefore(card.nextElementSibling, card);
        const index = targets.indexOf(zone);
        if (event.key === 'ArrowLeft' && index > 0) targets[index - 1].append(card);
        if (event.key === 'ArrowRight' && index < targets.length - 1) targets[index + 1].append(card);
        card.querySelector('.dashboard-handle').focus();
        remember();
      });
    });
    charts(shell, month);
  }
  window.NekumaDashboard = { expenses, setup, isDragging: () => dragging };
})();
