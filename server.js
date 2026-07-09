#!/usr/bin/env node
/*!
 * @ai-native-solutions/fallnet-api v1.0.0
 * HTTP wrapper around fallnet SDK. MIT.
 */

import express from 'express';
import fallnet from '@ai-native-solutions/fallnet-sdk';

// Optional WebRTC polyfill for Node
let hasWRTC = false;
try {
  const wrtc = await import('wrtc').catch(() => import('node-datachannel/polyfill').catch(() => null));
  if (wrtc) {
    const RTC = wrtc.default?.RTCPeerConnection || wrtc.RTCPeerConnection;
    if (RTC) { fallnet.configure({ RTCPeerConnection: RTC }); hasWRTC = true; }
  }
} catch {}

const RECV_LOG = [];
fallnet.onMessage(m => {
  RECV_LOG.push({ ts: Date.now(), msg: m });
  if (RECV_LOG.length > 500) RECV_LOG.shift();
});

const app = express();
app.use(express.json({ limit: '256kb' }));

// ─── Root / info ───────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'fallnet-api',
    version: '1.0.0',
    sdk: fallnet.VERSION,
    channel: fallnet.CHANNEL,
    stun: fallnet.STUN,
    webrtc_polyfill_loaded: hasWRTC,
    endpoints: [
      'GET  /health',
      'GET  /info',
      'POST /offer',
      'POST /accept',
      'POST /complete',
      'POST /send',
      'GET  /peers',
      'GET  /inbox'
    ]
  });
});

app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.get('/info', (_req, res) => {
  res.json({
    sdk: fallnet.VERSION,
    channel: fallnet.CHANNEL,
    stun: fallnet.STUN,
    webrtc_polyfill_loaded: hasWRTC,
    peer_count: fallnet.peers().length
  });
});

// ─── WebRTC handshake ──────────────────────────────────────────────
app.post('/offer', async (req, res) => {
  if (!hasWRTC) return res.status(501).json({ error: 'Node WebRTC polyfill not installed. Install `wrtc` or `node-datachannel`.' });
  try {
    const r = await fallnet.createOffer({ seedName: req.body?.seedName || 'api-node' });
    res.json({ peerId: r.peerId, sdp: r.sdp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/accept', async (req, res) => {
  if (!hasWRTC) return res.status(501).json({ error: 'Node WebRTC polyfill not installed.' });
  if (!req.body?.offer) return res.status(400).json({ error: 'missing `offer` field' });
  try {
    const r = await fallnet.acceptOffer(req.body.offer, { seedName: req.body?.seedName || 'api-node' });
    res.json({ peerId: r.peerId, sdp: r.sdp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/complete', async (req, res) => {
  if (!hasWRTC) return res.status(501).json({ error: 'Node WebRTC polyfill not installed.' });
  if (!req.body?.peerId || !req.body?.answer) return res.status(400).json({ error: 'missing `peerId` or `answer`' });
  try {
    const r = await fallnet.completeOffer(req.body.peerId, req.body.answer);
    res.json({ peerId: r.peerId, status: 'complete' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Messaging ─────────────────────────────────────────────────────
app.post('/send', (req, res) => {
  if (!req.body?.peerId || req.body.message === undefined) {
    return res.status(400).json({ error: 'need `peerId` and `message`' });
  }
  const sent = fallnet.send(req.body.peerId, req.body.message);
  res.json({ sent, peerId: req.body.peerId });
});

app.get('/peers', (_req, res) => res.json({ peers: fallnet.peers() }));

app.get('/inbox', (req, res) => {
  const lim = Math.max(1, Math.min(500, Number(req.query.limit) || 50));
  res.json({ inbox: RECV_LOG.slice(-lim) });
});

// ─── Boot ──────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`fallnet-api v1.0.0 · http://localhost:${port} · webrtc=${hasWRTC}`);
});
