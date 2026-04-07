# Tornfy — HCI Group Project
**Florida Gulf Coast University · HCI Course · 2025**

---

## What We're Building
A high-fidelity functional prototype that redesigns **Tornfy**, an existing sports management app, focused specifically on **Tennis Tournament Management**. The goal is to apply HCI principles to reduce interaction cost, improve information architecture, and make the experience accessible to all users.

---

## Design Principles (Non-Negotiable)
- **Nielsen's 10 Usability Heuristics** — guiding every UI decision
- **WCAG Accessibility Standards** — minimum 44×44pt touch targets, `accessibilityLabel` and `accessibilityRole` on all interactive elements
- **Inclusive design** — the app must be testable with external users in a usability study

---

## Two User Roles

| Role | Capabilities |
|---|---|
| **Player** | Browse tournaments · View rules & bracket · Register + dummy payment |
| **Admin** | Manage registered players · Enter match results · Update bracket in real-time |

---

## The "Happy Path" (Core Demo Loop)
```
Player logs in → Browses tournaments → Registers + pays →
Admin enters match result → Player sees updated bracket
```
This loop must be fully functional for the live demonstration.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 (Managed Workflow) |
| Language | TypeScript |
| Backend & Auth | Supabase (PostgreSQL + Row Level Security) |
| Device Testing | Expo Go app (scan QR code, no build needed) |

---

## Current Project State
The project skeleton is initialized and running on device via Expo Go.

```
HCI_Final_Project/
├── App.tsx                        ← Welcome screen (done)
├── supabase/schema.sql            ← DB schema (empty)
└── src/
    ├── types/index.ts             ← shared TS types (empty)
    ├── lib/supabase.ts            ← Supabase client (empty)
    ├── contexts/AuthContext.tsx   ← auth state (empty)
    ├── hooks/
    │   ├── useTournaments.ts      (empty)
    │   └── useMatches.ts          (empty)
    ├── navigation/
    │   ├── RootNavigator.tsx      (empty)
    │   ├── PlayerNavigator.tsx    (empty)
    │   └── AdminNavigator.tsx     (empty)
    ├── components/
    │   ├── TournamentBracket.tsx  ← key visual component (empty)
    │   ├── MatchCard.tsx          (empty)
    │   ├── PlayerCard.tsx         (empty)
    │   └── LoadingSpinner.tsx     (empty)
    └── screens/
        ├── auth/      LoginScreen · RegisterScreen
        ├── player/    TournamentList · TournamentDetail · Bracket · Payment · RegistrationConfirm
        └── admin/     AdminDashboard · PlayerManagement · MatchResult
```

---

## What Needs to Be Done Next
1. **Supabase setup** — create project, run schema, configure `.env`
2. **Navigation** — wire up Root → Auth → Player/Admin flows
3. **Auth screens** — Login & Register connected to Supabase
4. **Player screens** — Tournament list, detail, bracket view, payment flow
5. **Admin screens** — Match result entry + real-time bracket update
6. **Bracket component** — visual single-elimination draw
7. **Usability testing** — recruit external users, run sessions, document findings

---

## How to Run the Project Locally
```bash
git clone <repo-url>
cd HCI_Final_Project
npm install

# Copy .env.example → .env and fill in your Supabase credentials
cp .env.example .env

npx expo start
# Scan the QR code with Expo Go on your phone
```

> **Note:** Your phone and computer must be on the same Wi-Fi network.
> If connection fails, run `npx expo start --tunnel` instead.
