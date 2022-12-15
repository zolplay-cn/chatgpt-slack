import './utils/env';
import { App, LogLevel } from '@slack/bolt';
import { Server as WebSocketServer } from 'ws';
import { NodeHtmlMarkdown } from 'node-html-markdown';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.INFO,
  socketMode: true,
});
const ws = new WebSocketServer({ port: parseInt(process.env.WS_PORT || '3001') });
const notifiee = process.env.STATUS_CHECK_SLACK_MEMBER as string;
const markdownParser = new NodeHtmlMarkdown({
  strongDelimiter: '*',
  strikeDelimiter: '~',
  bulletMarker: '-',
});

function sendStatusCheckMessage(connected: boolean | string) {
  return app.client.chat.postMessage({
    token: app.client.token as string,
    channel: notifiee,
    text:
      typeof connected === 'boolean'
        ? `ChatGPT WebSocket ${connected ? 'connected :white_check_mark:' : 'disconnected :x:'}`
        : connected,
  });
}

type Payload = { text: string; ts: string; thread_ts?: string; channel: string };

// only send one message when the websocket is disconnected
let sessionExpired = false;

ws.on('connection', (socket) => {
  sendStatusCheckMessage(true);

  socket.on('message', (message) => {
    const packet = JSON.parse(message.toString());

    switch (packet.type) {
      case 'response':
        handleWSResponse(packet.payload);
        return;
      case 'session_expired':
        if (sessionExpired) return;

        sendStatusCheckMessage('ChatGPT session expired :x:');

        sessionExpired = true;
        return;
    }
  });
});

ws.on('close', () => {
  sendStatusCheckMessage(false);
});

function sendWSPrompt(payload: Payload) {
  ws.clients.forEach((client) => {
    client.send(
      JSON.stringify({
        type: 'prompt',
        payload,
      })
    );
  });
}

async function handleWSResponse(response: Payload) {
  const mrkdwn = markdownParser.translate(response.text);
  await app.client.chat.postMessage({
    token: app.client.token as string,
    channel: response.channel,
    thread_ts: response.thread_ts ?? response.ts,
    text: mrkdwn,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: mrkdwn,
        },
      },
    ],
  });
}

app.use(async ({ next }) => {
  await next();
});

const whitelistedChannels = [
  // #chatgpt-test for Cali's testing
  'C04EXK6T85U',
  // #chatgpt-playground for the public
  'C04F7ML901G',
];

// Listens to incoming messages that contain "hello"
app.message(/^q\?/, async ({ message, say }) => {
  // Filter out messages from channels that are not whitelisted
  if (!whitelistedChannels.includes(message.channel)) {
    return;
  }

  // Filter out message events with subtypes (see https://api.slack.com/events/message)
  if (message.subtype === undefined || message.subtype === 'bot_message') {
    const { text, ts, channel, thread_ts } = message;
    // check if the message is a valid string
    if (typeof text !== 'string') return;

    const prompt = text?.replace(/^q\?/, '').trim();

    if (prompt.length === 0) return;

    if (sessionExpired) {
      await say({
        text: `ChatGPT session expired, need to re-login in browser. /cc <@${notifiee}>`,
        thread_ts: thread_ts ?? ts,
        channel,
      });
      return;
    }

    sendWSPrompt({ text: prompt, ts, thread_ts, channel });

    await app.client.reactions.add({
      token: app.client.token as string,
      name: 'typingcat',
      channel,
      timestamp: ts,
    });
  }
});
(async () => {
  // Start your app
  await app.start(Number(process.env.PORT) || 3000);

  console.log('⚡️ Bolt app is running!');
})();
