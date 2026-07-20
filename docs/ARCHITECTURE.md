# MyKhata Architecture

> The truth about your money.

## 1. System overview

MyKhata is a mobile-first personal finance assistant for Australian users. The architecture separates **deterministic financial calculations** (server-side domain services) from **presentation** (React Server Components + minimal client islands) and **optional AI copy generation** (Phase 3).

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (PWA / Mobile)                    │
│  RSC pages · Client islands · Bottom nav · FAB command menu   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Next.js 15 App Router                      │
│  Server Actions · API routes · Middleware (auth guard)       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Domain Services Layer                     │
│  SafeToSpend · Affordability · Import · Categorisation · …   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              Supabase (Auth · Postgres · RLS · Storage)      │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│           Future: Bank Provider Adapters (Basiq, etc.)       │
└─────────────────────────────────────────────────────────────┘
```

### Assumptions

- **Money**: All amounts stored as integer cents (`bigint`). Never use floating point.
- **Locale**: Default `en-AU`, currency `AUD`, timezone `Australia/Melbourne`.
- **Auth**: Supabase email/password with email verification.
- **Bank sync**: Provider abstraction only in Phase 1; live Open Banking in Phase 4.
- **AI**: Never used for arithmetic. Insights use structured data summaries (Phase 3).
- **Demo mode**: Seeds realistic Australian data into the authenticated user's account.

---

## 2. Folder structure

```
src/
├── app/
│   ├── (auth)/              # login, signup, forgot-password, verify
│   ├── (onboarding)/        # multi-step onboarding wizard
│   ├── (app)/               # protected app shell + bottom nav
│   │   ├── home/
│   │   ├── activity/
│   │   ├── wishlist/
│   │   ├── goals/
│   │   └── profile/
│   ├── api/                 # webhooks, import uploads
│   ├── layout.tsx
│   └── globals.css
├── actions/                 # Server Actions (mutations)
├── components/
│   ├── ui/                  # shadcn primitives
│   ├── layout/              # shell, nav, FAB
│   ├── dashboard/
│   ├── auth/
│   ├── onboarding/
│   ├── transactions/
│   └── import/
├── domain/
│   ├── models/              # TypeScript domain types
│   ├── services/            # Business logic (testable)
│   ├── adapters/            # CSV, mock bank, future Basiq
│   └── providers/           # Bank provider interface
├── lib/
│   ├── supabase/            # client, server, middleware helpers
│   ├── currency/            # cents formatting, Decimal.js ops
│   ├── tone/                # Direct / Blunt / Roast copy
│   └── utils.ts
├── hooks/
└── types/
supabase/
└── migrations/              # SQL schema + RLS policies
docs/
tests/
└── unit/                    # Domain service unit tests
```

---

## 3. Database schema

All monetary columns are `bigint` (cents). All user-owned tables include `user_id` with RLS.

### Core tables

| Table | Purpose |
|-------|---------|
| `profiles` | Display name, currency, payday, income, tone, buffers |
| `user_preferences` | Notifications, work-hours display, caution level |
| `institutions` | CommBank, Westpac, etc. (per user) |
| `accounts` | Balances, types, protected flag, safe-to-spend inclusion |
| `bank_connections` | Future Open Banking consent state |
| `transactions` | Full transaction model with classification metadata |
| `merchant_rules` | User-specific merchant → category rules |
| `transfer_matches` | Paired internal transfers / CC repayments |
| `recurring_payments` | Detected subscriptions and bills |
| `goals` | Savings goals with targets and progress |
| `goal_contributions` | Contribution history |
| `wishlist_items` | Affordability-tracked purchase candidates |
| `affordability_calculations` | Cached calculation results |
| `insights` | Structured + AI-generated insights |
| `import_batches` | CSV import sessions |
| `imported_files` | Uploaded file metadata |
| `notifications` | User notification queue |
| `work_expense_details` | Tax-year work expense metadata |
| `audit_events` | Security-sensitive action log |

See `supabase/migrations/001_initial_schema.sql` for full DDL.

---

## 4. Core domain models

Key enums and types live in `src/domain/models/`.

- **Account**: institution, type, balances (cents), protected, purpose
- **Transaction**: amount (signed cents), direction, category, confidence, type
- **SafeToSpendResult**: breakdown lines, total, confidence, assumptions
- **AffordabilityResult**: verdict, consequences, goal delays, work hours
- **Insight**: title, message, severity, evidence, tone
- **ImportBatch**: status, row counts, errors

---

## 5. Safe-to-spend calculation design

Deterministic engine in `SafeToSpendService`.

### Inputs

- Usable account balances (excluding protected)
- Credit card balances owed
- Upcoming bills & subscriptions before payday
- Expected essential discretionary spend (groceries, fuel pace)
- Days until payday
- Protected savings
- Pending income
- Minimum cash buffer (user preference)
- Wishlist reservations
- Planned goal contributions
- Caution level (relaxed / balanced / conservative)

### Formula (simplified)

```
usable_cash = sum(spending_accounts.available_balance)
            - sum(protected_account_balances unless overridden)

obligations = upcoming_bills
            + upcoming_subscriptions
            + credit_card_balance
            + expected_essential_spend
            + planned_goal_contributions
            + wishlist_reservations
            + safety_buffer (scaled by caution level)

safe_to_spend = usable_cash + expected_income_before_payday - obligations
```

### Output

```typescript
interface SafeToSpendResult {
  safeToSpendCents: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceReason?: string;
  breakdown: BreakdownLine[];
  assumptions: string[];
  daysUntilPayday: number;
}
```

Confidence degrades when: < 2 months history, variable income, missing bill detection, manual accounts only.

---

## 6. Wishlist affordability design

Deterministic engine in `AffordabilityService`.

### Inputs

Item price, safe-to-spend, cash, protected savings, bills, goals, buffer, target date, ongoing costs, payment method.

### Logic

```
available_for_purchase =
  safe_to_spend
  + optional_wishlist_savings
  - minimum_remaining_buffer
```

### Verdicts

| Verdict | Conditions |
|---------|------------|
| `yes` | Bills covered, buffer intact, no protected savings used |
| `technically_yes` | Possible but buffer/goal impact |
| `wait` | Safe after known income event |
| `no` | Bills at risk, buffer breached |
| `absolutely_not` | Already projected short, worsens debt |
| `save_first` | Need more savings before purchase |
| `protected_savings_required` | Would need protected funds |

Returns structured consequences: post-purchase safe-to-spend, goal delays (days), work hours cost, earliest safe date.

---

## 7. Development phases

### Phase 1 (current)
Project setup, auth, database, demo mode, accounts, transactions, CSV import, categorisation, transfer detection, home dashboard.

### Phase 2
Safe-to-spend engine (full), bills, subscriptions, goals, wishlist, affordability calculator.

### Phase 3
AI insights, tone modes, monthly reports, notifications, work-expense tracking.

### Phase 4
PWA polish, performance, accessibility, testing, security review, Basiq provider adapter.

---

## 8. Key domain services

| Service | Responsibility |
|---------|----------------|
| `CurrencyService` | Format, parse, cents arithmetic |
| `TransactionImportService` | Orchestrate CSV → DB pipeline |
| `TransactionNormalisationService` | Normalise adapter output |
| `CategorisationService` | Layered classification |
| `MerchantRuleService` | Learn from user corrections |
| `TransferDetectionService` | Match transfers & CC repayments |
| `RecurringPaymentService` | Detect subscriptions |
| `SafeToSpendService` | Core safe-to-spend calculation |
| `GoalForecastService` | Project goal completion dates |
| `AffordabilityService` | Wishlist verdict engine |
| `InsightService` | Structured insights (+ AI Phase 3) |
| `WorkExpenseService` | AU tax-year summaries |
| `AccountBalanceService` | Aggregate balances |
