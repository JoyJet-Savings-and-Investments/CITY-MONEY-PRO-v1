/* ============================================================
   City-Money Pro — Application Logic
   ============================================================ */

(function () {
  'use strict';

  /* -------------------- CONFIG -------------------- */
  const ASSETS = [
    // Crypto
    { symbol: 'BTC',  id: 'bitcoin',      name: 'Bitcoin',     class: 'Crypto' },
    { symbol: 'ETH',  id: 'ethereum',     name: 'Ethereum',    class: 'Crypto' },
    { symbol: 'BNB',  id: 'binancecoin',  name: 'BNB',         class: 'Crypto' },
    { symbol: 'SOL',  id: 'solana',       name: 'Solana',      class: 'Crypto' },
    { symbol: 'XRP',  id: 'ripple',       name: 'XRP',         class: 'Crypto' },
    { symbol: 'ADA',  id: 'cardano',      name: 'Cardano',     class: 'Crypto' },
    { symbol: 'DOGE', id: 'dogecoin',     name: 'Dogecoin',    class: 'Crypto' },
    { symbol: 'AVAX', id: 'avalanche-2',  name: 'Avalanche',   class: 'Crypto' },
    { symbol: 'DOT',  id: 'polkadot',     name: 'Polkadot',    class: 'Crypto' },
    { symbol: 'LINK', id: 'chainlink',    name: 'Chainlink',   class: 'Crypto' },
    // Stocks (mock / static demo prices)
    { symbol: 'AAPL', id: 'aapl', name: 'Apple',        class: 'Stock' },
    { symbol: 'MSFT', id: 'msft', name: 'Microsoft',    class: 'Stock' },
    { symbol: 'GOOGL',id: 'googl',name: 'Alphabet',     class: 'Stock' },
    { symbol: 'TSLA', id: 'tsla', name: 'Tesla',        class: 'Stock' },
    { symbol: 'AMZN', id: 'amzn', name: 'Amazon',       class: 'Stock' },
    // Mutual Funds (mock)
    { symbol: 'VTSAX',id: 'vtsax',name: 'Vanguard Total Stock', class: 'Mutual Fund' },
    { symbol: 'VFIAX',id: 'vfiax',name: 'Vanguard 500 Index',   class: 'Mutual Fund' },
    { symbol: 'FXAIX',id: 'fxaix',name: 'Fidelity 500 Index',   class: 'Mutual Fund' }
  ];

  const SYMBOLS = ASSETS.map(a => a.symbol);
  const ID_MAP  = Object.fromEntries(ASSETS.map(a => [a.symbol, a.id]));
  const CLASS_MAP = Object.fromEntries(ASSETS.map(a => [a.symbol, a.class]));
  const NAME_MAP  = Object.fromEntries(ASSETS.map(a => [a.symbol, a.name]));

  const CRYPTO_IDS = ASSETS.filter(a => a.class === 'Crypto').map(a => a.id).join(',');

  // Fallback / mock prices (updated periodically in code comments)
  const FALLBACK_PRICES = {
    bitcoin: { usd: 87500, usd_24h_change: 1.1 },
    ethereum: { usd: 3150, usd_24h_change: -0.4 },
    binancecoin: { usd: 620, usd_24h_change: 0.6 },
    solana: { usd: 145, usd_24h_change: 2.3 },
    ripple: { usd: 0.62, usd_24h_change: 0.2 },
    cardano: { usd: 0.48, usd_24h_change: -0.8 },
    dogecoin: { usd: 0.14, usd_24h_change: 3.1 },
    'avalanche-2': { usd: 32, usd_24h_change: 1.5 },
    polkadot: { usd: 7.1, usd_24h_change: -0.3 },
    chainlink: { usd: 16.2, usd_24h_change: 0.7 },
    aapl: { usd: 228, usd_24h_change: 0.4 },
    msft: { usd: 425, usd_24h_change: 0.2 },
    googl: { usd: 178, usd_24h_change: -0.1 },
    tsla: { usd: 265, usd_24h_change: 1.8 },
    amzn: { usd: 195, usd_24h_change: 0.5 },
    vtsax: { usd: 135, usd_24h_change: 0.3 },
    vfiax: { usd: 520, usd_24h_change: 0.25 },
    fxaix: { usd: 195, usd_24h_change: 0.3 }
  };

  const MAX_HISTORY = 200;
  const COOKIE_NAME = 'citymoney_logged_in';
  const COOKIE_DAYS = 365;

  /* -------------------- STATE -------------------- */
  let appState = loadAppState();
  let prices = {};
  let charts = {};
  let sellTarget = null;
  let portfolioModalMode = 'new'; // 'new' | 'rename'
  let contributeGoalId = null;
  let lastFocusedElement = null;

  /* -------------------- UTILITIES -------------------- */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function roundUnits(n) {
    return Math.round(n * 1e8) / 1e8;
  }

  function formatUSD(n) {
    return '$' + Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function formatUnits(n) {
    if (n >= 1) return n.toFixed(4);
    if (n >= 0.01) return n.toFixed(6);
    return n.toFixed(8);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function emptyHoldings() {
    const h = {};
    SYMBOLS.forEach(s => { h[s] = { units: 0, cost: 0 }; });
    return h;
  }

  function createPortfolio(name) {
    return {
      name: name || 'Main Portfolio',
      mainBalance: 5000,
      holdings: emptyHoldings(),
      realizedPnL: 0,
      transactions: [],
      portfolioHistory: [{ t: Date.now(), v: 5000 }],
      alerts: [],
      goals: []
    };
  }

  /* -------------------- PERSISTENCE -------------------- */
  function loadAppState() {
    try {
      const saved = localStorage.getItem('citymoney_pro_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        // ensure required fields
        Object.values(parsed.portfolios || {}).forEach(p => {
          if (!p.alerts) p.alerts = [];
          if (!p.goals) p.goals = [];
          if (!p.portfolioHistory) p.portfolioHistory = [{ t: Date.now(), v: p.mainBalance || 0 }];
          if (!p.holdings) p.holdings = emptyHoldings();
          SYMBOLS.forEach(s => {
            if (!p.holdings[s]) p.holdings[s] = { units: 0, cost: 0 };
          });
        });
        return parsed;
      }
    } catch (e) { /* ignore */ }
    return {
      activePortfolioId: 'main',
      portfolios: { main: createPortfolio('Main Portfolio') }
    };
  }

  function saveAppState() {
    try {
      localStorage.setItem('citymoney_pro_v1', JSON.stringify(appState));
    } catch (e) {
      console.warn('Could not save state', e);
    }
  }

  function current() {
    return appState.portfolios[appState.activePortfolioId];
  }

  /* -------------------- AUTH / COOKIE -------------------- */
  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? match[1] : null;
  }

  function isLoggedIn() {
    return getCookie(COOKIE_NAME) === 'true';
  }

  function setLoggedIn(val) {
    if (val) setCookie(COOKIE_NAME, 'true', COOKIE_DAYS);
    else setCookie(COOKIE_NAME, '', -1);
  }

  /* -------------------- THEME -------------------- */
  function initTheme() {
    const saved = localStorage.getItem('citymoney_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('themeToggle').textContent = saved === 'dark' ? '☀️' : '🌙';
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('citymoney_theme', next);
    document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
    // Destroy & re-init charts for proper theme colors
    destroyCharts();
    initCharts();
    updateCharts();
  }

  /* -------------------- MODAL HELPERS (a11y) -------------------- */
  function openModal(id) {
    lastFocusedElement = document.activeElement;
    const overlay = document.getElementById(id);
    overlay.classList.add('open');
    // focus first focusable
    const focusable = overlay.querySelector('input, select, button, textarea');
    if (focusable) setTimeout(() => focusable.focus(), 50);
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.open').forEach(el => {
      if (el.id !== 'loginOverlay') el.classList.remove('open');
    });
  }

  // Esc key closes topmost modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const open = [...document.querySelectorAll('.modal-overlay.open')]
        .filter(m => m.id !== 'loginOverlay');
      if (open.length) closeModal(open[open.length - 1].id);
    }
  });

  /* -------------------- PRICE ENGINE -------------------- */
  function getPrice(symbol) {
    const id = ID_MAP[symbol];
    return (prices[id] && prices[id].usd) || 0;
  }

  async function fetchPrices() {
    const loader = document.getElementById('priceLoading');
    if (loader) loader.classList.remove('hidden');

    try {
      if (!navigator.onLine) throw new Error('offline');

      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO_IDS}&vs_currencies=usd&include_24hr_change=true`
      );
      if (!res.ok) throw new Error('API error');
      const cryptoData = await res.json();

      // Merge with static stock / MF prices (slight random walk for demo feel)
      prices = { ...FALLBACK_PRICES, ...cryptoData };
      // tiny random movement for non-crypto
      ASSETS.filter(a => a.class !== 'Crypto').forEach(a => {
        const base = FALLBACK_PRICES[a.id]?.usd || 100;
        const change = (Math.random() - 0.5) * 0.8; // ±0.4%
        prices[a.id] = {
          usd: +(base * (1 + change / 100)).toFixed(2),
          usd_24h_change: +(change).toFixed(2)
        };
      });
    } catch (e) {
      console.warn('Price fetch failed, using fallback', e);
      prices = { ...FALLBACK_PRICES };
    }

    if (loader) loader.classList.add('hidden');
    renderPrices();
    renderHoldings();
    renderBalances();
    updateCharts();
    checkAlerts();
    if (sellTarget) updateSellEstimate(); // keep estimate fresh
  }

  /* -------------------- CALCULATIONS -------------------- */
  function getCostBasis() {
    return Object.values(current().holdings).reduce((s, h) => s + (h.cost || 0), 0);
  }

  function getMarketValue() {
    return SYMBOLS.reduce((sum, sym) => {
      const h = current().holdings[sym];
      return sum + (h ? h.units * getPrice(sym) : 0);
    }, 0);
  }

  function appendHistoryPoint() {
    const p = current();
    const total = p.mainBalance + getMarketValue();
    p.portfolioHistory.push({ t: Date.now(), v: total });
    // keep last ~90 points for chart
    if (p.portfolioHistory.length > 90) {
      p.portfolioHistory = p.portfolioHistory.slice(-90);
    }
  }

  /* -------------------- RENDER -------------------- */
  function renderPortfolioSelect() {
    const sel = document.getElementById('portfolioSelect');
    sel.innerHTML = Object.entries(appState.portfolios).map(([id, p]) =>
      `<option value="${escapeHtml(id)}" ${id === appState.activePortfolioId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
    ).join('');
  }

  function renderBalances() {
    const p = current();
    const cost = getCostBasis();
    const market = getMarketValue();
    const unrealized = market - cost;
    const realized = p.realizedPnL || 0;
    const totalPnL = unrealized + realized;

    document.getElementById('mainBalance').textContent = formatUSD(p.mainBalance);
    document.getElementById('investedBalance').textContent = formatUSD(cost);
    document.getElementById('marketValue').textContent = formatUSD(market);

    const pnlEl = document.getElementById('totalPnL');
    pnlEl.textContent = formatUSD(totalPnL);
    pnlEl.className = 'value ' + (totalPnL >= 0 ? 'positive' : 'negative');

    const breakdown = document.getElementById('pnlBreakdown');
    breakdown.innerHTML = `Unrealized ${formatUSD(unrealized)} · Realized ${formatUSD(realized)}`;
    breakdown.className = 'sub ' + (totalPnL >= 0 ? 'positive' : 'negative');
  }

  function renderPrices() {
    const grid = document.getElementById('priceGrid');
    // Show a compact selection: top cryptos + a couple stocks
    const show = ['BTC','ETH','SOL','AAPL','MSFT','TSLA','VTSAX','VFIAX'];
    grid.innerHTML = show.map(sym => {
      const a = ASSETS.find(x => x.symbol === sym);
      const p = prices[ID_MAP[sym]] || {};
      const change = p.usd_24h_change || 0;
      const cls = change >= 0 ? 'positive' : 'negative';
      return `
        <div class="price-item">
          <h4>${escapeHtml(sym)}</h4>
          <div class="price">${p.usd ? formatUSD(p.usd) : '—'}</div>
          <div class="change ${cls}">${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%</div>
        </div>`;
    }).join('');
  }

  function renderHoldings() {
    const body = document.getElementById('holdingsBody');
    const rows = SYMBOLS.map(sym => {
      const h = current().holdings[sym] || { units: 0, cost: 0 };
      const price = getPrice(sym);
      const market = h.units * price;
      const pnl = market - h.cost;
      const has = h.units > 1e-10;
      if (!has) return null;
      const pnlCls = pnl >= 0 ? 'positive' : 'negative';
      return `
        <tr>
          <td><strong>${escapeHtml(sym)}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(NAME_MAP[sym] || '')}</span></td>
          <td>${escapeHtml(CLASS_MAP[sym] || '')}</td>
          <td>${formatUnits(h.units)}</td>
          <td>${formatUSD(h.cost)}</td>
          <td>${formatUSD(market)}</td>
          <td class="${pnlCls}">${formatUSD(pnl)}</td>
          <td><button class="sell-btn" data-symbol="${escapeHtml(sym)}">Sell</button></td>
        </tr>`;
    }).filter(Boolean);

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">📭</div><p>No holdings yet. Go to Invest to start building your portfolio.</p></div></td></tr>`;
      return;
    }
    body.innerHTML = rows.join('');
    body.querySelectorAll('.sell-btn').forEach(btn => {
      btn.addEventListener('click', () => openSellModal(btn.dataset.symbol));
    });
  }

  function renderTransactions() {
    const list = document.getElementById('txList');
    const txs = current().transactions || [];
    if (!txs.length) {
      list.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>No transactions yet.</p></div>`;
      return;
    }
    list.innerHTML = txs.map(tx => {
      const dir = tx.amount >= 0 ? 'In' : 'Out';
      const amtCls = tx.amount >= 0 ? 'positive' : 'negative';
      return `
        <div class="tx-item">
          <div class="detail">${escapeHtml(tx.detail)}</div>
          <span class="direction">${dir}</span>
          <div class="amount ${amtCls}">${formatUSD(Math.abs(tx.amount))}</div>
          <div class="date">${escapeHtml(tx.date)}</div>
        </div>`;
    }).join('');
  }

  function renderAlerts() {
    const list = document.getElementById('alertsList');
    const alerts = current().alerts || [];
    if (!alerts.length) {
      list.innerHTML = `<div class="empty-state"><div class="icon">🔔</div><p>No active alerts. Create one above.</p></div>`;
      return;
    }
    list.innerHTML = alerts.map(a => `
      <div class="alert-item">
        <div>
          <strong>${escapeHtml(a.symbol)}</strong>
          ${a.direction === 'above' ? '≥' : '≤'} ${formatUSD(a.price)}
        </div>
        <button class="remove" data-id="${escapeHtml(a.id)}" title="Remove" aria-label="Remove alert">×</button>
      </div>
    `).join('');
    list.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', () => {
        current().alerts = current().alerts.filter(x => x.id !== btn.dataset.id);
        saveAppState();
        renderAlerts();
        toast('Alert removed');
      });
    });
  }

  function renderGoals() {
    const grid = document.getElementById('goalsGrid');
    const goals = current().goals || [];
    if (!goals.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">🎯</div><p>No goals yet. Create a home, education, retirement or custom goal to start tracking progress.</p></div>`;
      return;
    }
    grid.innerHTML = goals.map(g => {
      const pct = Math.min(100, (g.current / g.target) * 100);
      return `
        <div class="card goal-card">
          <div class="goal-header">
            <div>
              <div class="goal-title">${escapeHtml(g.name)}</div>
              <div class="goal-target">${escapeHtml(g.type)} · Target ${formatUSD(g.target)}</div>
            </div>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="goal-stats">
            <span>${formatUSD(g.current)} saved</span>
            <span>${pct.toFixed(1)}%</span>
          </div>
          <div class="goal-actions">
            <button class="btn btn-sm btn-primary contribute-btn" data-id="${escapeHtml(g.id)}">+ Contribute</button>
            <button class="btn btn-sm btn-ghost delete-goal-btn" data-id="${escapeHtml(g.id)}">Delete</button>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.contribute-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        contributeGoalId = btn.dataset.id;
        document.getElementById('contributeAmount').value = '';
        openModal('contributeModal');
      });
    });
    grid.querySelectorAll('.delete-goal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        current().goals = current().goals.filter(g => g.id !== btn.dataset.id);
        saveAppState();
        renderGoals();
        toast('Goal deleted');
      });
    });
  }

  function populateSelects() {
    const opts = ASSETS.map(a =>
      `<option value="${escapeHtml(a.symbol)}">${escapeHtml(a.name)} (${escapeHtml(a.symbol)}) — ${escapeHtml(a.class)}</option>`
    ).join('');
    document.getElementById('assetSelect').innerHTML = opts;
    document.getElementById('alertSymbol').innerHTML = opts;
  }

  function renderAll() {
    renderPortfolioSelect();
    renderBalances();
    renderPrices();
    renderHoldings();
    renderTransactions();
    renderAlerts();
    renderGoals();
    updateCharts();
  }

  /* -------------------- CHARTS -------------------- */
  function destroyCharts() {
    Object.values(charts).forEach(c => { if (c) c.destroy(); });
    charts = {};
  }

  function initCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded');
      return;
    }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tickColor = isDark ? '#848e9c' : '#6b7280';
    const gridColor = isDark ? '#2b3139' : '#e1e4e8';
    const common = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: tickColor } } }
    };

    const hist = current().portfolioHistory || [];
    const labels = hist.map((_, i) => i === hist.length - 1 ? 'Now' : '');
    const data = hist.map(h => h.v);

    charts.portfolio = new Chart(document.getElementById('portfolioChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Portfolio',
          data,
          borderColor: '#f0b90b',
          backgroundColor: 'rgba(240,185,11,0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 0
        }]
      },
      options: {
        ...common,
        scales: {
          x: { ticks: { color: tickColor }, grid: { color: gridColor } },
          y: { ticks: { color: tickColor }, grid: { color: gridColor } }
        }
      }
    });

    charts.allocation = new Chart(document.getElementById('allocationChart'), {
      type: 'doughnut',
      data: {
        labels: SYMBOLS,
        datasets: [{
          data: SYMBOLS.map(() => 0),
          backgroundColor: [
            '#f0b90b','#627eea','#f3ba2f','#14f195','#23292f',
            '#0033ad','#c2a633','#e84142','#e6007a','#2a5ada',
            '#a2aaad','#00a4ef','#4285f4','#cc0000','#ff9900',
            '#c8102e','#1e3a5f','#00a651'
          ]
        }]
      },
      options: { ...common, cutout: '62%' }
    });
  }

  function updateCharts() {
    if (!charts.portfolio) return;
    const p = current();
    const market = getMarketValue();
    const total = p.mainBalance + market;

    // update last point
    const hist = [...(p.portfolioHistory || [])];
    if (hist.length) hist[hist.length - 1] = { t: Date.now(), v: total };
    charts.portfolio.data.labels = hist.map((_, i) => i === hist.length - 1 ? 'Now' : '');
    charts.portfolio.data.datasets[0].data = hist.map(h => h.v);
    charts.portfolio.update('none');

    if (charts.allocation) {
      charts.allocation.data.datasets[0].data =
        SYMBOLS.map(s => (current().holdings[s]?.units || 0) * getPrice(s));
      charts.allocation.update('none');
    }
  }

  /* -------------------- ACTIONS -------------------- */
  function addTransaction(type, detail, amount) {
    const today = new Date().toISOString().slice(0, 10);
    const tx = {
      id: uid(),
      type,
      detail,
      amount, // signed
      date: today
    };
    current().transactions.unshift(tx);
    // limit length
    if (current().transactions.length > MAX_HISTORY) {
      current().transactions = current().transactions.slice(0, MAX_HISTORY);
    }
    saveAppState();
    renderTransactions();
  }

  function addMoney() {
    const val = parseFloat(document.getElementById('addMoneyAmount').value);
    if (!val || val <= 0) { toast('Enter a valid amount', 'error'); return; }
    current().mainBalance += val;
    addTransaction('Deposit', `Added ${formatUSD(val)}`, val);
    appendHistoryPoint();
    saveAppState();
    closeModal('addMoneyModal');
    renderAll();
    toast(`Added ${formatUSD(val)}`);
  }

  function invest() {
    const symbol = document.getElementById('assetSelect').value;
    const amountInput = document.getElementById('investAmount');
    const val = parseFloat(amountInput.value);
    if (!val || val <= 0) { toast('Please enter a valid amount', 'error'); return; }
    if (val > current().mainBalance) { toast('Insufficient available cash', 'error'); return; }
    const price = getPrice(symbol);
    if (!price) { toast('Price not available yet. Please wait.', 'error'); return; }

    const units = roundUnits(val / price);
    const h = current().holdings[symbol];
    h.units = roundUnits(h.units + units);
    h.cost += val;
    current().mainBalance -= val;

    addTransaction('Invest', `Invested ${formatUSD(val)} in ${symbol} (${formatUnits(units)} units)`, -val);
    appendHistoryPoint();
    saveAppState();
    amountInput.value = '';
    renderAll();
    toast(`Bought ${formatUnits(units)} ${symbol} for ${formatUSD(val)}`);
    showSection('dashboard');
  }

  function openSellModal(symbol) {
    const h = current().holdings[symbol];
    if (!h || h.units <= 0) return;
    sellTarget = symbol;
    document.getElementById('sellTitle').textContent = `Sell ${symbol}`;
    document.getElementById('sellPercent').value = '100';
    updateSellEstimate();
    openModal('sellModal');
  }

  function updateSellEstimate() {
    if (!sellTarget) return;
    const pct = parseFloat(document.getElementById('sellPercent').value) / 100;
    const h = current().holdings[sellTarget];
    const proceeds = h.units * pct * getPrice(sellTarget);
    document.getElementById('sellEstimate').textContent = formatUSD(proceeds);
  }

  function confirmSell() {
    if (!sellTarget) return;
    const pct = parseFloat(document.getElementById('sellPercent').value) / 100;
    const h = current().holdings[sellTarget];
    const unitsToSell = roundUnits(h.units * pct);
    const costSold = h.cost * pct;
    const proceeds = unitsToSell * getPrice(sellTarget);
    const pnl = proceeds - costSold;

    h.units = roundUnits(h.units - unitsToSell);
    h.cost -= costSold;
    if (h.units < 1e-10) { h.units = 0; h.cost = 0; }

    current().mainBalance += proceeds;
    current().realizedPnL = (current().realizedPnL || 0) + pnl;

    const sign = pnl >= 0 ? '+' : '';
    addTransaction('Sell',
      `Sold ${formatUnits(unitsToSell)} ${sellTarget} for ${formatUSD(proceeds)} (P&L ${sign}${formatUSD(pnl)})`,
      proceeds);
    appendHistoryPoint();
    saveAppState();
    closeModal('sellModal');
    sellTarget = null;
    renderAll();
    toast(`Sold ${sellTarget}: ${formatUSD(proceeds)} (P&L ${sign}${formatUSD(pnl)})`);
  }

  /* Portfolios */
  function switchPortfolio() {
    appState.activePortfolioId = document.getElementById('portfolioSelect').value;
    saveAppState();
    renderAll();
    toast(`Switched to ${current().name}`);
  }

  function openNewPortfolio() {
    portfolioModalMode = 'new';
    document.getElementById('portfolioModalTitle').textContent = 'New Portfolio';
    document.getElementById('portfolioNameInput').value = '';
    openModal('portfolioModal');
  }

  function openRenamePortfolio() {
    portfolioModalMode = 'rename';
    document.getElementById('portfolioModalTitle').textContent = 'Rename Portfolio';
    document.getElementById('portfolioNameInput').value = current().name;
    openModal('portfolioModal');
  }

  function confirmPortfolioAction() {
    const name = document.getElementById('portfolioNameInput').value.trim();
    if (!name) { toast('Enter a name', 'error'); return; }
    if (name.length > 40) { toast('Name too long', 'error'); return; }

    if (portfolioModalMode === 'new') {
      const id = 'p_' + uid();
      const p = createPortfolio(name);
      p.mainBalance = 0;
      p.portfolioHistory = [{ t: Date.now(), v: 0 }];
      appState.portfolios[id] = p;
      appState.activePortfolioId = id;
      toast(`Created portfolio "${name}"`);
    } else {
      current().name = name;
      toast('Portfolio renamed');
    }
    saveAppState();
    closeModal('portfolioModal');
    renderAll();
  }

  /* Goals */
  function confirmGoal() {
    const name = document.getElementById('goalName').value.trim();
    const type = document.getElementById('goalType').value;
    const target = parseFloat(document.getElementById('goalTarget').value);
    const currentAmt = parseFloat(document.getElementById('goalCurrent').value) || 0;

    if (!name) { toast('Enter a goal name', 'error'); return; }
    if (!target || target < 100) { toast('Target must be at least $100', 'error'); return; }
    if (currentAmt < 0) { toast('Current saved cannot be negative', 'error'); return; }

    if (!current().goals) current().goals = [];
    current().goals.push({
      id: uid(),
      name,
      type,
      target,
      current: currentAmt
    });
    saveAppState();
    closeModal('goalModal');
    renderGoals();
    toast(`Goal "${name}" created`);
  }

  function confirmContribute() {
    const amount = parseFloat(document.getElementById('contributeAmount').value);
    if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (amount > current().mainBalance) { toast('Insufficient available cash', 'error'); return; }

    const goal = current().goals.find(g => g.id === contributeGoalId);
    if (!goal) return;

    goal.current += amount;
    current().mainBalance -= amount;
    addTransaction('Goal', `Contributed ${formatUSD(amount)} to "${goal.name}"`, -amount);
    appendHistoryPoint();
    saveAppState();
    closeModal('contributeModal');
    renderAll();
    toast(`Contributed ${formatUSD(amount)} to ${goal.name}`);
  }

  /* Alerts */
  function addAlert() {
    const symbol = document.getElementById('alertSymbol').value;
    const price = parseFloat(document.getElementById('alertPrice').value);
    const direction = document.getElementById('alertDirection').value;
    if (!price || price <= 0) { toast('Enter a valid target price', 'error'); return; }
    if (!current().alerts) current().alerts = [];
    current().alerts.push({ id: uid(), symbol, price, direction });
    saveAppState();
    document.getElementById('alertPrice').value = '';
    renderAlerts();
    toast(`Alert set: ${symbol} ${direction === 'above' ? '≥' : '≤'} ${formatUSD(price)}`);
  }

  function checkAlerts() {
    const alerts = current().alerts || [];
    const remaining = [];
    alerts.forEach(a => {
      const cur = getPrice(a.symbol);
      if (!cur) { remaining.push(a); return; }
      const triggered = a.direction === 'above' ? cur >= a.price : cur <= a.price;
      if (triggered) {
        toast(`ALERT: ${a.symbol} is now ${formatUSD(cur)} (target ${formatUSD(a.price)})`, 'alert');
      } else {
        remaining.push(a);
      }
    });
    if (remaining.length !== alerts.length) {
      current().alerts = remaining;
      saveAppState();
      renderAlerts();
    }
  }

  /* CSV */
  function exportCSV() {
    const txs = current().transactions;
    if (!txs.length) { toast('No transactions to export', 'error'); return; }
    const header = 'Date,Type,Detail,Amount,Direction\n';
    const rows = txs.map(t => {
      const dir = t.amount >= 0 ? 'In' : 'Out';
      return `"${t.date}","${t.type}","${t.detail.replace(/"/g, '""')}",${t.amount},"${dir}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citymoney-${current().name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported');
  }

  function clearHistory() {
    current().transactions = [];
    saveAppState();
    closeModal('clearHistoryModal');
    renderTransactions();
    toast('History cleared');
  }

  /* -------------------- NAVIGATION -------------------- */
  function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.dataset.section === id);
    });
    document.getElementById('navLinks').classList.remove('open');
    document.getElementById('hamburger').setAttribute('aria-expanded', 'false');
  }

  /* -------------------- START / LOGIN -------------------- */
  function startApp() {
    document.getElementById('loginOverlay').classList.remove('open');
    document.getElementById('app').classList.add('visible');
    document.getElementById('app').setAttribute('aria-hidden', 'false');
    document.getElementById('topNav').style.display = 'flex';
    document.getElementById('mainFooter').classList.remove('logged-out');

    // Welcome message
    const hour = new Date().getHours();
    let greeting = 'Welcome back';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    document.getElementById('welcomeMsg').textContent = `${greeting}! Here’s your portfolio overview.`;

    populateSelects();
    initCharts();
    renderAll();
    fetchPrices();
    setInterval(fetchPrices, 60000);
  }

  function logout() {
    setLoggedIn(false);
    document.getElementById('app').classList.remove('visible');
    document.getElementById('app').setAttribute('aria-hidden', 'true');
    document.getElementById('topNav').style.display = 'none';
    document.getElementById('mainFooter').classList.add('logged-out');
    destroyCharts();
    closeAllModals();
    document.getElementById('loginOverlay').classList.add('open');
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').textContent = '';
    document.getElementById('email').focus();
  }

  /* -------------------- OFFLINE -------------------- */
  function updateOnlineStatus() {
    const banner = document.getElementById('offlineBanner');
    if (navigator.onLine) banner.classList.remove('visible');
    else banner.classList.add('visible');
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  /* -------------------- EVENT BINDINGS -------------------- */
  function bindEvents() {
    // Login
    document.getElementById('loginBtn').addEventListener('click', () => {
      const email = document.getElementById('email').value.trim();
      const pass = document.getElementById('password').value;
      const err = document.getElementById('loginError');
      if (email === 'India@gmail.com' && pass === 'Anthony') {
        setLoggedIn(true);
        err.textContent = '';
        startApp();
      } else {
        err.textContent = 'Invalid email or password';
      }
    });
    document.getElementById('password').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });
    document.getElementById('email').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('password').focus();
    });

    // Password toggle
    document.getElementById('togglePassword').addEventListener('click', () => {
      const input = document.getElementById('password');
      const btn = document.getElementById('togglePassword');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
        btn.setAttribute('aria-label', 'Show password');
      }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Theme
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Nav
    document.getElementById('hamburger').addEventListener('click', () => {
      const links = document.getElementById('navLinks');
      const open = links.classList.toggle('open');
      document.getElementById('hamburger').setAttribute('aria-expanded', open);
    });
    document.querySelectorAll('[data-section]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        if (el.dataset.section) showSection(el.dataset.section);
      });
    });

    // Dashboard actions
    document.getElementById('addMoneyBtn').addEventListener('click', () => {
      document.getElementById('addMoneyAmount').value = '';
      openModal('addMoneyModal');
    });
    document.getElementById('confirmAddMoney').addEventListener('click', addMoney);
    document.getElementById('cancelAddMoney').addEventListener('click', () => closeModal('addMoneyModal'));

    document.getElementById('withdrawBtn').addEventListener('click', () => openModal('withdrawModal'));
    document.getElementById('closeWithdrawModal').addEventListener('click', () => closeModal('withdrawModal'));

    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);

    // Invest
    document.getElementById('investBtn').addEventListener('click', invest);

    // Sell
    document.getElementById('sellPercent').addEventListener('change', updateSellEstimate);
    document.getElementById('confirmSellBtn').addEventListener('click', confirmSell);
    document.getElementById('cancelSellBtn').addEventListener('click', () => {
      closeModal('sellModal');
      sellTarget = null;
    });

    // Portfolios
    document.getElementById('newPortfolioBtn').addEventListener('click', openNewPortfolio);
    document.getElementById('renamePortfolioBtn').addEventListener('click', openRenamePortfolio);
    document.getElementById('portfolioSelect').addEventListener('change', switchPortfolio);
    document.getElementById('confirmPortfolio').addEventListener('click', confirmPortfolioAction);
    document.getElementById('cancelPortfolio').addEventListener('click', () => closeModal('portfolioModal'));

    // Goals
    document.getElementById('newGoalBtn').addEventListener('click', () => {
      document.getElementById('goalName').value = '';
      document.getElementById('goalTarget').value = '';
      document.getElementById('goalCurrent').value = '0';
      openModal('goalModal');
    });
    document.getElementById('confirmGoal').addEventListener('click', confirmGoal);
    document.getElementById('cancelGoal').addEventListener('click', () => closeModal('goalModal'));
    document.getElementById('confirmContribute').addEventListener('click', confirmContribute);
    document.getElementById('cancelContribute').addEventListener('click', () => closeModal('contributeModal'));

    // Alerts
    document.getElementById('addAlertBtn').addEventListener('click', addAlert);

    // History
    document.getElementById('clearHistoryBtn').addEventListener('click', () => openModal('clearHistoryModal'));
    document.getElementById('confirmClearHistory').addEventListener('click', clearHistory);
    document.getElementById('cancelClearHistory').addEventListener('click', () => closeModal('clearHistoryModal'));
  }

  /* -------------------- INIT -------------------- */
  function init() {
    initTheme();
    updateOnlineStatus();
    bindEvents();

    if (isLoggedIn()) {
      startApp();
    } else {
      document.getElementById('mainFooter').classList.add('logged-out');
      document.getElementById('email').focus();
    }
  }

  // Run when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
