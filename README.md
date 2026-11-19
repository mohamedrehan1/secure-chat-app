# P2P Chat

Private one-to-one chat, voice and video calls that go straight between two browsers. There are no
accounts, no backend and no message server. The app is a static site and an installable PWA.

## How it works

1. **Invite.** One person taps _Create invite_. The app creates a WebRTC offer, compresses it, and
   puts it in a link (`/#o=…`) and a QR code. The code sits in the URL fragment, so the web host
   never receives it.
2. **Reply.** The other person opens the link or scans it in the app, and sends back a reply link
   (`/#a=…`).
3. **Connect.** The inviter taps the reply link, or scans or pastes it. A link tapped in the same
   browser hands the reply to the waiting tab through `BroadcastChannel`. The two browsers then
   connect directly.
4. **Verify.** Both screens show the same 5 emoji. Compare them face to face or on a call, then tap
   _They match_.

Chat, calls and the emoji check all run over the browsers' encrypted WebRTC connection (DTLS). Call
setup is renegotiated over that same connection, so starting a call needs no new codes.

### Reconnect automatically (optional, per chat)

A saved, verified chat can turn on **Reconnect automatically** in Chat info. Both people have to
turn it on. After that, when both of you open the app, it reconnects without a new invite:

1. **Agreeing a secret.** While connected, the two apps agree on a secret over the encrypted direct
   connection. It's derived from the emoji-check values, which never left that connection.
2. **Finding each other.** When the app opens, it uses public Nostr relays (`src/common/rendezvous/relays.ts`)
   as a mailbox. One side posts an encrypted "I'm here" note every 5 seconds; the other replies with
   the same invite and reply codes a link would carry, also encrypted.
3. **Connecting.** The two devices then connect directly, and the relays drop out. A code is used only
   if it comes from the device this chat was verified with.

- **What relays see:** encrypted notes posted to a random mailbox address that changes every hour,
  their timing, and your IP address. They can't see who you are, who you talk to, or any message.
- **What it can't do:** deliver anything while the app is closed. Both of you need the app open at the
  same time.
- **What stops it:** _End chat_ pauses it until you next open the app. Turning the switch off, turning
  saving off, or _Delete all data_ forgets the secret.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:lan      # HTTPS on your LAN, so phones get the camera, mic and WebRTC
npm test             # unit tests
npm run build        # type-check, then build to dist/
```

## Deploy (Netlify)

Use `npm run build` with `dist/` as the publish folder; `netlify.toml` already sets both. Deploy
`dist/` by drag and drop, or connect the repository.

- `netlify.toml` sets the security headers: a strict Content Security Policy, `Referrer-Policy:
  no-referrer`, and a `Permissions-Policy` that allows only the camera and microphone. It also
  sets cache rules, so service worker updates arrive promptly.
- `public/_redirects` sends every path to `index.html`, so reloading `/chat/…` works.
- For another host, copy the headers and the rewrite. The policy must keep `'wasm-unsafe-eval'`,
  or the QR scanner breaks on browsers without a built-in QR reader (desktop Chrome on Windows, for
  example).

## Privacy and security

| What | How it's handled | What's left |
| --- | --- | --- |
| Message and call content | Encrypted end to end by WebRTC (DTLS/SRTP). There's no relay server. | — |
| The web host | Only serves static files. Codes travel in the URL fragment, which isn't sent to it. | It sees page loads: IP address, browser and time. |
| Someone intercepting the invite (man in the middle) | The emoji check is built from both devices' fingerprints plus random values exchanged commit-then-reveal, so it can't be steered. A match proves there's nobody in between. | Only protects you if you actually compare the emoji. |
| A different device reconnecting to a saved chat | Each browser keeps a one-year identity certificate. A saved, verified chat remembers the other device, warns if a different one connects, and saves nothing until you check again. | Clearing browser data or "Delete all data" creates a new identity, and peers then see the warning. |
| STUN (`stun.cloudflare.com`) | Only helps each device find its public address. | It sees your IP address and timing, never content. |
| Nostr relays (only if auto-reconnect is on) | They see encrypted notes, an hourly-changing mailbox address and a fresh key per chat per launch. A code is used only if it comes from the pinned device. | They see when you're online and your IP address. The mailbox secret is stored **unencrypted** in IndexedDB, like saved messages. |
| The other person | — | They see your public IP address, which is inherent to direct connections. |
| Saved messages | Off by default, per chat. Turning saving off deletes that chat's messages. _Delete all data_ wipes everything. | Stored **unencrypted** in the browser (IndexedDB). |

Untrusted input (codes, QR content and every message over the connection) is size-capped and
validated with zod before use. Messages are shown as plain text, never as HTML.

## Limits

- **Some networks can't connect.** Mobile carriers and strict office or school Wi-Fi often block
  direct connections, and fixing that needs a relay (TURN) server, which this app deliberately
  doesn't use. The app explains the likely cause when a connection fails.
- **Both people must keep the app open.** There's no server, so nothing is delivered while the app
  is closed. iOS stops background pages within seconds.
- **A dropped connection needs a new invite,** unless both of you turned on _Reconnect automatically_.
  Saved chats also have _Reconnect_, which keeps the same chat and history.
- **On iPhone, the installed app and Safari are separate.** A tapped invite link opens in Safari, so
  scan or paste inside the installed app instead.
- **Unverified on real devices:** iOS Safari (storing the certificate, compression, scanning),
  Firefox, and calls across real mobile networks.

## Project layout

```
src/
  routes/router.tsx            "/" home, "/chat/:room" chat
  modules/home|chat|handoff/   screens, split into features
  common/rtc/                  peer session, call control, renegotiation, security-code exchange
  common/signaling/            invite/reply codec, zod schemas, tab hand-off
  common/identity/             persistent certificate, security-code derivation
  common/history/              IndexedDB layer (idb) and TanStack Query hooks
  common/rendezvous/           opt-in auto-reconnect over Nostr relays (crypto, relay list, watcher)
  common/session/              the one live session, trust and saving rules
```
