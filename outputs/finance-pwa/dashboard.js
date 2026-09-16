(function () {
  'use strict';
  const cardClasses = ['overview-card', 'paypal-panel', 'dashboard-cards-panel', 'housing-panel', 'vehicle-panel', 'subscriptions-panel', 'financial-calendar-panel', 'work-calendar-panel', 'family-pie-panel', 'dashboard-trend-panel', 'emergency-reserve-panel', 'crypto-panel', 'goals-panel', 'debt-home-panel', 'consortium-home-panel', 'family-tools-panel', 'family-panel', 'country-expenses-panel', 'recent-transactions-panel'];
  let sortables = [];
  let dragging = false;
  let pinned = {};
  let selectedCountry = '';
  const migrateKey = key => ['expenses-brasil', 'expenses-japao'].includes(key) ? 'country-expenses-panel' : key;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = (value, currency) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2 }).format(value);

  function expenses(models, monthLabel) {
    if (!models.length) return '';
    if (!models.some(model => model.country === selectedCountry)) selectedCountry = models[0].country;
    const slides = models.map(model => {
      let cursor = 0;
      const sectors = model.categories.map(item => {
        const percent = item.amount / model.total * 100;
        const offset = cursor;
        cursor += percent;
        return `<circle class="expense-sector" data-category="${escape(item.key)}" cx="100" cy="100" r="72" pathLength="100" fill="none" stroke="${item.color}" stroke-width="24" stroke-dasharray="${Math.max(0.05, percent - 0.7)} ${100 - Math.max(0.05, percent - 0.7)}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)" tabindex="0" role="button" aria-pressed="false" aria-label="${escape(item.label)}: ${escape(money(item.amount, model.currency))}, ${percent.toFixed(1)}%"><title>${escape(item.label)}</title></circle>`;
      }).join('');
      const compactLegend = model.categories.map(item => {
        const percent = item.amount / model.total * 100;
        return `<button type="button" class="expense-legend-row" data-category="${escape(item.key)}" aria-pressed="false" style="--category-color:${item.color}"><i></i><span><strong>${escape(item.label)}</strong><small>${percent.toFixed(1).replace('.', ',')}%</small></span></button>`;
      }).join('') || '<p class="empty-state">Nenhuma despesa registrada ou prevista neste mês.</p>';
      const details = model.categories.map(item => {
        const percent = item.amount / model.total * 100;
        return `<div class="expense-detail-row" style="--category-color:${item.color}"><i></i><div><strong>${escape(item.label)}</strong><span>${percent.toFixed(1).replace('.', ',')}% · ${escape(money(item.amount, model.currency))}</span>${item.banks.map(bank => `<small>${escape(bank.name)} · ${escape(money(bank.amount, model.currency))}</small>`).join('')}</div></div>`;
      }).join('');
      return `<section class="expense-country-slide expenses-${model.country}" data-expense-country="${model.country}" aria-label="${model.country === 'brasil' ? 'Brasil' : 'Japão'}" ${model.country !== selectedCountry ? 'hidden' : ''}>
        <div class="country-expenses-body">
          <div class="expense-donut"><svg viewBox="0 0 200 200" aria-label="Despesas por categoria"><circle cx="100" cy="100" r="72" fill="none" stroke="#e5eae7" stroke-width="24"/>${sectors}</svg><div class="expense-donut-total"><span>Total do mês</span><strong>${escape(money(model.total, model.currency))}</strong></div></div>
          <div class="expense-legend">${compactLegend}</div>
        </div>
        ${details ? `<details class="expense-details"><summary>Descrição das Despesas</summary><div class="expense-detail-list">${details}</div></details>` : ''}
        ${(model.pendingCountry || []).map(item => `<button class="small-action ghost" type="button" data-action="open-modal" data-modal="crypto" data-id="${escape(item.id)}">Definir país: ${escape(item.name)}</button>`).join('')}
      </section>`;
    }).join('');
    return `<article class="content-panel country-expenses-panel">
      <div class="panel-head"><div><h2>Despesas e aportes</h2><p class="row-meta">${escape(monthLabel)} · Registrados e previstos</p></div>
      <div class="expense-country-controls">${models.length > 1 ? '<button type="button" class="small-action ghost" data-expense-step="-1" aria-label="País anterior" title="País anterior"><i data-lucide="chevron-left" aria-hidden="true"></i></button>' : ''}<span class="chip blue" data-expense-country-label aria-live="polite">${selectedCountry === 'brasil' ? 'BRASIL' : 'JAPÃO'}</span>${models.length > 1 ? '<button type="button" class="small-action ghost" data-expense-step="1" aria-label="Próximo país" title="Próximo país"><i data-lucide="chevron-right" aria-hidden="true"></i></button>' : ''}</div></div>
      <div class="expense-country-viewport">${slides}</div>
    </article>`;
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
    root.querySelectorAll('.country-expenses-panel').forEach(card => {
      const slides = [...card.querySelectorAll('[data-expense-country]')];
      const change = step => {
        const index = slides.findIndex(slide => !slide.hidden);
        const next = slides[(index + step + slides.length) % slides.length];
        selectedCountry = next.dataset.expenseCountry;
        slides.forEach(slide => { slide.hidden = slide !== next; });
        card.querySelector('[data-expense-country-label]').textContent = selectedCountry === 'brasil' ? 'BRASIL' : 'JAPÃO';
      };
      card.querySelectorAll('[data-expense-step]').forEach(button => button.addEventListener('click', () => change(Number(button.dataset.expenseStep))));
      const viewport = card.querySelector('.expense-country-viewport');
      let start = null;
      viewport.addEventListener('touchstart', event => {
        const touch = event.touches.length === 1 ? event.touches[0] : null;
        start = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }, { passive: true });
      viewport.addEventListener('touchend', event => {
        const touch = event.changedTouches[0];
        if (start && touch && slides.length > 1) {
          const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) change(dx < 0 ? 1 : -1);
        }
        start = null;
      }, { passive: true });
      viewport.addEventListener('touchcancel', () => { start = null; }, { passive: true });
    });
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
    const mode = mobile ? 'mobile' : 'desktopLanes';
    let targets = zones;
    if (mobile) {
      const zone = document.createElement('div');
      zone.className = 'dashboard-mobile-zone';
      shell.append(zone);
      const order = [...(Array.isArray(layouts.mobile) ? layouts.mobile : []).map(migrateKey), ...cardClasses];
      new Set(order).forEach(key => { if (cards.has(key)) zone.append(cards.get(key)); });
      zones.forEach(column => column.remove());
      targets = [zone];
    } else {
      const zone = document.createElement('div');
      zone.className = 'dashboard-stable-columns';
      shell.append(zone);
      const legacyOrder = Array.isArray(layouts.desktop)
        ? layouts.desktop.flatMap(column => Array.isArray(column) ? column : [])
        : [];
      const order = [...(Array.isArray(layouts.desktopFlow) ? layouts.desktopFlow : legacyOrder).map(migrateKey), ...cardClasses];
      const count = window.matchMedia('(min-width: 1600px)').matches ? 3 : window.matchMedia('(min-width: 760px)').matches ? 2 : 1;
      const lanes = Array.from({ length: count }, () => {
        const lane = document.createElement('div');
        lane.className = 'dashboard-stable-lane';
        zone.append(lane);
        return lane;
      });
      const saved = Array.isArray(layouts.desktopLanes) ? layouts.desktopLanes : [];
      const placed = new Set();
      saved.forEach((keys, index) => (Array.isArray(keys) ? keys : []).map(migrateKey).forEach(key => {
        if (cards.has(key) && !placed.has(key)) { lanes[index % count].append(cards.get(key)); placed.add(key); }
      }));
      new Set(order).forEach(key => {
        if (!cards.has(key) || placed.has(key)) return;
        const lane = lanes.reduce((best, item) => item.offsetHeight < best.offsetHeight ? item : best);
        lane.append(cards.get(key));
        placed.add(key);
      });
      zones.forEach(column => column.remove());
      targets = lanes;
      if (!saved.length) save({ ...layouts, desktopLanes: lanes.map(lane => [...lane.children].map(card => card.dataset.dashboardCard)) });
    }
    const remember = () => {
      const orders = targets.map(zone => [...zone.children].filter(card => card.dataset.dashboardCard).map(card => card.dataset.dashboardCard));
      save({ ...layouts, [mode]: mobile || mode === 'desktopFlow' ? orders[0] : orders });
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
