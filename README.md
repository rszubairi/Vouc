# Oolala — React Native + Convex

Monorepo containing the React Native mobile app, Next.js admin web portal, and shared Convex backend for the Oolala network application.

## Structure

```
oolala-rn/
├── convex/              # Shared Convex backend (schema + queries + mutations)
│   ├── schema.ts        # Full database schema (35 tables)
│   ├── auth.config.ts   # Email/password + OTP auth
│   ├── profiles.ts      # User CRUD, sponsor approval, follow
│   ├── posts.ts         # Feed, create, distribute, engage
│   ├── events.ts        # Calendar events, RSVP, attendance
│   ├── library.ts       # Library items, divisions, categories
│   ├── notifications.ts # In-app notification queries
│   └── hierarchy.ts     # getDownline / getUpline algorithms
│
├── apps/
│   ├── mobile/          # Expo React Native (Expo Router)
│   │   └── app/
│   │       ├── (auth)/  # login, register, forgot-password
│   │       └── (app)/   # drawer nav + all main screens
│   │
│   └── web/             # Next.js 14 admin portal → Vercel
│       └── app/
│           └── dashboard/  # profiles, events, divisions, etc.
│
└── .env.example         # All required environment variables
```

## Prerequisites

- Node.js 20+
- [Convex account](https://convex.dev) (free)
- [Expo account + EAS CLI](https://expo.dev) (for mobile builds)
- [Vercel account](https://vercel.com) (for web admin)
- [Resend account](https://resend.com) (for email OTP)

## Quick Start

### 1. Install dependencies

```bash
cd oolala-rn
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This will:
- Prompt you to log in / create a project
- Deploy the schema and functions
- Print your `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`

Copy those values into a `.env.local` file (see `.env.example`).

### 3. Configure auth

Generate auth keys:
```bash
npx @convex-dev/auth generate-keys
```

Add `JWT_PRIVATE_KEY` and `SITE_URL` to your Convex environment via the dashboard or:
```bash
npx convex env set JWT_PRIVATE_KEY "..."
npx convex env set SITE_URL "https://your-admin.vercel.app"
npx convex env set AUTH_RESEND_KEY "re_..."
```

### 4. Run the mobile app

```bash
cd apps/mobile
cp ../../.env.example .env.local
# Set EXPO_PUBLIC_CONVEX_URL in .env.local
npm start
```

Then press `a` for Android emulator or `i` for iOS simulator.

### 5. Run the web admin

```bash
cd apps/web
npm run dev
# Open http://localhost:3000
```

### 6. Deploy

**Web (Vercel):**
```bash
cd apps/web
vercel deploy
```
Set `NEXT_PUBLIC_CONVEX_URL` in the Vercel environment variables dashboard.

**Mobile (EAS):**
```bash
cd apps/mobile
eas build --platform android
eas build --platform ios
```

**Convex (production):**
```bash
npx convex deploy --prod
```

## Key concepts

| Concept | Implementation |
|---------|---------------|
| Pyramid hierarchy | `profileHierarchies` table; rebuilt on sponsor approval |
| Content distribution | `PostVisibility` / `EventVisibility` / `LibraryVisibility` computed on create |
| No sideline rule | Only upline/downline/group/custom recipients get visibility records |
| Real-time updates | Convex reactive queries (`useQuery`) auto-update on data change |
| Push notifications | Expo Notifications (wrapping FCM) + `pushNotifications` Convex table |
| Auth | `@convex-dev/auth` with Password + ResendOTP providers |

## Adding screens

Add a new file under `apps/mobile/app/(app)/` — Expo Router picks it up automatically. Use `useQuery(api.xxx.yyy)` to subscribe to Convex data.

## Requirements reference

See [../OOLALA_REQUIREMENTS.md](../OOLALA_REQUIREMENTS.md) for the full system requirements derived from the original codebase.
