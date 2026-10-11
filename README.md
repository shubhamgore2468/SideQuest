# Sidequest — LA Tech Week

A standard Next.js app for exploring LA Tech Week events, planning your week, finding nearby places, and making networking profiles with shareable QR cards.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. `npm run build` creates a production build, and `npm start` runs it with Node.js.

Copy `.env.example` to `.env.local` and set the Clerk publishable and secret keys from the same Clerk application. Enable Google in that application's sign-in options, then restart the development server. With both keys configured, the header shows Sign in or Log out. Without both keys, the app runs with anonymous browser sessions.

Signed-in profiles, plans, attendance, and connection notes belong to the Clerk account and can be loaded on another browser. Guest data stays in its browser session and is separate from account data; logging out returns to that guest session.

The server stores application data in `data/sidequest.sqlite`, created automatically on first use. Keep that file on persistent storage when hosting the app; temporary serverless disks will not preserve it.

## Google Calendar

Sign-in opens Google directly; Sidequest does not offer ChatGPT sign-in. Other providers can also be disabled in the Clerk dashboard.

My Day automatically reads Google Calendar on page load for October 12–18, 2026, and has a Refresh calendar button. If access is missing, click Connect Google Calendar to grant read-only access. Imported events stay private, are not stored in the public catalogue, and are excluded from shared itineraries and ICS exports. Saved Sidequest events are preserved. Calendar reads require an internet connection.

Configure these additional scopes for Clerk's Google connection and in Google's OAuth consent configuration:

- `https://www.googleapis.com/auth/calendar.events.readonly`
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`

Subscribed calendars are included, so Partiful events can arrive after you add your Partiful feed to Google Calendar. Partiful feed updates may take roughly 24 hours. Existing Google connections must grant the new scopes; signing in alone does not grant Calendar access.

Run calendar integration checks with `node --test scripts/calendar.test.mjs`.
