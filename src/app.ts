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
  ignore: ['button', 'svg'],
  codeFence: '```',
  // textReplace: [
  //   [/\<span/g, '<p'],
  //   [/\span\>/g, 'p>'],
  // ],
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
  // await app.start(Number(process.env.PORT) || 3000);

  // console.log('⚡️ Bolt app is running!');
  console.log(
    markdownParser.translate(`<p>Sure, here is an example of a basic React button component:</p><pre><div class="bg-black mb-4 rounded-md"><div class="flex items-center relative text-gray-200 bg-gray-800 px-4 py-2 text-xs font-sans"><button class="flex ml-auto gap-2"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>Copy code</button></div><div class="p-4"><code class="!whitespace-pre-wrap hljs language-javascript"><span class="hljs-keyword">import</span> <span class="hljs-title class_">React</span> <span class="hljs-keyword">from</span> <span class="hljs-string">'react'</span>;

<span class="hljs-keyword">const</span> <span class="hljs-title function_">Button</span> = (<span class="hljs-params">{ text, onClick }</span>) =&gt; (
  <span class="xml"><span class="hljs-tag">&lt;<span class="hljs-name">button</span> <span class="hljs-attr">onClick</span>=<span class="hljs-string">{onClick}</span>&gt;</span>{text}<span class="hljs-tag">&lt;/<span class="hljs-name">button</span>&gt;</span></span>
);

<span class="hljs-keyword">export</span> <span class="hljs-keyword">default</span> <span class="hljs-title class_">Button</span>;
</code></div></div></pre><p>This component takes in two props: <code>text</code> and <code>onClick</code>. The <code>text</code> prop is used to specify the text that should be displayed on the button, and the <code>onClick</code> prop is a function that will be called when the button is clicked.</p><p>You can use this component in your React app like this:</p><pre><div class="bg-black mb-4 rounded-md"><div class="flex items-center relative text-gray-200 bg-gray-800 px-4 py-2 text-xs font-sans"><button class="flex ml-auto gap-2"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>Copy code</button></div><div class="p-4"><code class="!whitespace-pre-wrap hljs language-javascript"><span class="hljs-keyword">import</span> <span class="hljs-title class_">React</span> <span class="hljs-keyword">from</span> <span class="hljs-string">'react'</span>;
<span class="hljs-keyword">import</span> <span class="hljs-title class_">Button</span> <span class="hljs-keyword">from</span> <span class="hljs-string">'./Button'</span>;

<span class="hljs-keyword">const</span> <span class="hljs-title function_">App</span> = (<span class="hljs-params"></span>) =&gt; {
  <span class="hljs-keyword">const</span> <span class="hljs-title function_">handleClick</span> = (<span class="hljs-params"></span>) =&gt; {
    <span class="hljs-comment">// do something when the button is clicked</span>
  };

  <span class="hljs-keyword">return</span> <span class="xml"><span class="hljs-tag">&lt;<span class="hljs-name">Button</span> <span class="hljs-attr">text</span>=<span class="hljs-string">"Click me"</span> <span class="hljs-attr">onClick</span>=<span class="hljs-string">{handleClick}</span> /&gt;</span></span>;
};
</code></div></div></pre><p>This example creates a <code>Button</code> component and passes it the text "Click me" and a callback function called <code>handleClick</code> that will be called when the button is clicked.</p><p>Hope this helps! Let me know if you have any other questions.</p>`)
  );
})();
