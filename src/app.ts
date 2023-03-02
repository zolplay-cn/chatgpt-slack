import './utils/env';
import { App, LogLevel } from '@slack/bolt';

import { Configuration, OpenAIApi } from 'openai'

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.INFO,
  socketMode: true,
});
const notifiee = process.env.STATUS_CHECK_SLACK_MEMBER as string;
const whitelistedChannels = process.env.SLACK_WHITELISTED_CHANNELS?.split(',') || [];

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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        }
      ],
      temperature: 0,
    });

    if (response.data.choices.length > 0) {
      const message = response.data.choices[response.data.choices.length - 1].message?.content
      if (message) {
        await say({
          text: message,
          channel,
          thread_ts: thread_ts || ts,
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
(async () => {
  // Start your app
  await app.start(Number(process.env.PORT) || 3000);

  console.log('⚡️ Bolt app is running!');
})();
