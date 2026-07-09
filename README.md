# @ai-native-solutions/fallnet-api

**HTTP API for fallnet.** Express wrapper around `@ai-native-solutions/fallnet-sdk`. Exposes the WebRTC P2P mesh over REST.

## Install & run

```bash
npm install @ai-native-solutions/fallnet-api
npx fallnet-api
# → http://localhost:8080
```

Or Docker:

```bash
docker compose up -d
```

Or via image:

```bash
docker build -t fallnet-api .
docker run -p 8080:8080 fallnet-api
```

## Node WebRTC polyfill

Install alongside for the offer/accept/complete endpoints:

```bash
npm install wrtc
# or
npm install node-datachannel
```

Without a polyfill, WebRTC endpoints return `501`. `/peers`, `/inbox`, `/info`, `/health` still work.

## Endpoints

| Method | Path | Body / Query | Purpose |
|---|---|---|---|
| GET  | `/`         | — | Server info + endpoint list |
| GET  | `/health`   | — | Liveness |
| GET  | `/info`     | — | SDK version, channel, STUN, peer count |
| POST | `/offer`    | `{ seedName? }` | Peer A creates offer |
| POST | `/accept`   | `{ offer, seedName? }` | Peer B accepts + returns answer |
| POST | `/complete` | `{ peerId, answer }` | Peer A finalizes |
| POST | `/send`     | `{ peerId, message }` | Send to a peer |
| GET  | `/peers`    | — | List peers |
| GET  | `/inbox`    | `?limit=50` | Recent inbound messages |

## Curl smoke test

```bash
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/info
curl http://localhost:8080/peers
curl -X POST http://localhost:8080/offer -H 'content-type: application/json' -d '{"seedName":"node-a"}'
```

## License

MIT · part of [AI Native Solutions](https://ai-nativesolutions.com)
