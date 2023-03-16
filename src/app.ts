import './utils/env';
import { App, LogLevel } from '@slack/bolt';

import { Configuration, OpenAIApi } from 'openai';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.INFO,
  socketMode: true,
});
const notifiee = process.env.STATUS_CHECK_SLACK_MEMBER as string;
const whitelistedChannels = process.env.SLACK_WHITELISTED_CHANNELS?.split(',') || [];
let members: Record<string, string> = {};

const openAIConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openAIConfig);

// Listens to incoming messages that starts with "q?"
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

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    });

    if (response.data.choices.length > 0) {
      const message = response.data.choices[response.data.choices.length - 1].message?.content;
      if (message) {
        await say({
          text: message,
          channel,
          thread_ts: thread_ts || ts,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: message,
              },
            },
          ],
        });
        return;
      }
    }

    await say({
      text: 'Sorry, something went wrong. Please try again later.',
      channel,
      thread_ts: thread_ts || ts,
    });
  }
});

// Listens to incoming messages that starts with "i?"
app.message(/^i\?/, async ({ message, say }) => {
  // Filter out messages from channels that are not whitelisted
  if (!whitelistedChannels.includes(message.channel)) {
    return;
  }
  // Filter out message events with subtypes (see https://api.slack.com/events/message)
  if (message.subtype === undefined || message.subtype === 'bot_message') {
    const { text, ts, channel, thread_ts } = message;
    // check if the message is a valid string
    if (typeof text !== 'string') return;

    const prompt = text?.replace(/^i\?/, '').trim();

    if (prompt.length === 0) return;

    const response = await openai.createImage({
      prompt,
      size: '512x512',
      response_format: 'url',
    });

    if (response.data.data.length > 0) {
      await say({
        text: `Here's an image for "${prompt}"`,
        channel,
        thread_ts: thread_ts || ts,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Here's an image for "${prompt}"`,
            },
          },
          ...response.data.data.map(({ url }) => ({
            type: 'image',
            image_url: url,
            alt_text: prompt,
          })),
        ],
      });
      return;
    }
  }
});

app.message(/tldr/i, async ({ message, say, client }) => {
  console.log('Received message', message);
  if (message.subtype === undefined && message.thread_ts) {
    try {
      const result = await client.conversations.replies({
        channel: message.channel,
        ts: message.thread_ts,
      });

      if (!result.messages) {
        console.error('Could not retrieve messages in thread');
        return;
      }

      const inEnglish = message.text?.includes(' en');

      const threadMessages = result.messages.map((msg) => ({
        user: msg.user ? members[msg.user] : null,
        text: msg.text,
      }));
      const consolidatedMessages = threadMessages.map((msg) => `${msg.user}: ${msg.text}`).join('\n');
      const prompt = `Generate TL;DR for the following conversation${
        inEnglish ? ' in English' : ' in Simplified Chinese'
      }}:\n
      \n${consolidatedMessages}`;

      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
      });

      if (response.data.choices.length > 0) {
        const res = response.data.choices[response.data.choices.length - 1].message?.content;
        if (res) {
          await say({
            text: res,
            channel: message.channel,
            thread_ts: message.thread_ts,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: res,
                },
              },
            ],
          });
          return;
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
});

(async () => {
  // Start your app
  await app.start(Number(process.env.PORT) || 3000);

  console.log('⚡️ Bolt app is running!');

  const result = await app.client.users.list();
  if (result.members) {
    members = result.members.reduce((acc, member) => {
      if (member.id) {
        acc[member.id] =
          member.profile?.display_name || member.profile?.real_name || member.real_name || member.name || '';
      }
      return acc;
    }, {} as Record<string, string>);
  }
})();
