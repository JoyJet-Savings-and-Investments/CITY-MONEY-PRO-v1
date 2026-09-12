# City-Money Pro — Personal Investment Dashboard

A clean, professional, fully client-side personal finance & investment simulator.

**Paper trading only.** No real money, no real brokerage accounts, no on-chain transactions.

---

## Features

- **Multi-asset portfolio** — Crypto, Stocks, and Mutual Funds
- **Live crypto prices** via CoinGecko (with offline fallback)
- **Goal tracking** — Home, Education, Retirement (and custom goals) with progress bars
- **Add Money / Withdraw** (withdraw blocked until $10,000 available balance for goals)
- **Buy & Sell** with average cost basis and realized / unrealized P&L split
- **Price alerts** with unique IDs
- **Transaction history** (last 200 entries) + CSV export + Clear History
- **Multi-portfolio** support
- **Dark / Light theme**
- **Fully responsive** design with hamburger navigation
- **Accessibility** — keyboard support (Esc to close modals), focus management, ARIA attributes
- **Offline detection** and loading states
- **Session persistence** (365-day cookie)

---

## Quick Start

1. Open `index.html` in any modern browser  
   (or deploy the folder to GitHub Pages / Netlify / Vercel)

2. Sign in with:
   - **Email:** `India@gmail.com`
   - **Password:** `Anthony`

3. Explore the dashboard, set goals, invest, and track progress.

> Credentials are **not** displayed on the login screen.

---

## Project Structure

```
city-money-pro/
├── index.html      # Markup & structure
├── styles.css      # Design system & responsive styles
├── app.js          # Application logic
└── README.md       # This file
```

---

## Tech Stack

| Technology       | Purpose                          |
|------------------|----------------------------------|
| HTML5            | Semantic structure               |
| CSS3 (Custom Properties) | Theming, layout, responsiveness |
| Vanilla JavaScript | State, UI logic, API calls     |
| Chart.js 4       | Portfolio & allocation charts    |
| CoinGecko API    | Live crypto prices               |
| localStorage     | Portfolio & preference data      |
| Cookies          | 365-day login session            |

No build step, no framework, no backend required.

---

## Cost Basis Method

Holdings use **average cost basis**.  
When you buy more of an asset, the new cost is added to the existing cost pool and units are averaged.

---

## Withdrawal Policy

Withdrawals are restricted until you have an **available balance of $10,000 USD**.  
This is designed to encourage disciplined saving toward long-term goals.

---

## License

MIT License — free to use, modify, and learn from.
