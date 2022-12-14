import './utils/env'
import { App, LogLevel } from '@slack/bolt'
import { ChatGPTAPI, getOpenAIAuth } from 'chatgpt'

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.INFO,
  socketMode: true,
})

app.use(async ({ next }) => {
  await next()
})

const whitelistedChannels = [
  // #chatgpt-test for Cali's testing
  'C04EXK6T85U',
]

let chatGPT: ChatGPTAPI

// Listens to incoming messages that contain "hello"
app.message(async ({ message, say }) => {
  // Filter out messages from channels that are not whitelisted
  if (!whitelistedChannels.includes(message.channel)) {
    return
  }

  // Filter out message events with subtypes (see https://api.slack.com/events/message)
  if (message.subtype === undefined || message.subtype === 'bot_message') {
    const { text } = message
    // check if the message is a valid string
    if (typeof text !== 'string' || text?.trim() === '') {
      return
    }

    const pendingMessage = await say({
      thread_ts: message.ts,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `<@${message.user}> 处理中... 稍等一下!`,
          },
        },
      ],
      text: `<@${message.user}> 处理中... 稍等一下!`,
    })

    const chatGPTResponse = await chatGPT.sendMessage(text)

    console.log(chatGPTResponse)

    // delete the pending message
    if (pendingMessage.ts) {
      await app.client.chat.delete({
        ts: pendingMessage.ts,
        channel: message.channel,
      })
    }
  }
})
;(async () => {
  // Start your app
  await app.start(Number(process.env.PORT) || 3000)

  console.log('⚡️ Bolt app is running!')

  const openAIAuth = await getOpenAIAuth({
    email: process.env.OPENAI_EMAIL,
    password: process.env.OPENAI_PASSWORD,
  })
  chatGPT = new ChatGPTAPI({ ...openAIAuth })
  const result = await chatGPT.ensureAuth()
  console.log('ChatGPT Auth Result: ', result)
})()
