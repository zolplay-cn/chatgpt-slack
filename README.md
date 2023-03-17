# ChatGPT Slack Bot

Make sure to enter your env variables in `.env`

```bash
pnpm i
cp .env.example .env
# development
pnpm dev
# production
pnpm start
```

## Features

### Ask questions

![Ask Questions Demo](https://cdn.sanity.io/images/h37lu1pz/production/0c202a03ca243a6a5fbafdfbfc05c3cfe76d9d3e-1815x1021.png?w=850&fit=max&auto=format&dpr=2)

Format: `q? <question>`

### Generate images

![Generate Images Demo](https://cdn.sanity.io/images/h37lu1pz/production/a04e980dbc82353ca4d40a32cdd323f2603e8b0e-1806x1016.png?w=850&fit=max&auto=format&dpr=2)

Format: `i? <image prompt>`

### Summarize TL;DR

![Summarize TL;DR Demo](https://cdn.sanity.io/images/h37lu1pz/production/e0d0036c709956d5f042abe220a0717b80304b0c-2353x1324.png?w=850&fit=max&auto=format&dpr=2)

Format: `@your-bot tldr`

## How do I create a Slack bot?

To create a Slack bot on the Slack website, follow these steps:

1. Go to the Slack API website: https://api.slack.com/
2. Sign in to your Slack account or create a new one if you haven't already.
3. Click on the "Your Apps" button on the top-right corner of the page, or use this direct link: https://api.slack.com/apps
4. Click the "Create New App" button.
5. In the "Create a Slack App" dialog, enter the following information:
   App Name: Choose a name for your Slack bot.
   Development Slack Workspace: Select a workspace where you want to develop and test your Slack bot.
   Click the "Create App" button.
6. After creating the app, you'll be redirected to the "Basic Information" page. Here, you can find your "App ID" and manage your app settings.
7. Under "Add features and functionality," click on "Bots" and then click the "Add a bot" button to add a bot user to your app.
8. Set a display name and default username for your bot and click "Add Bot" to save.
9. From the left sidebar, click on "OAuth & Permissions" under "Features."
10. Scroll down to the "Scopes" section and add the necessary bot token scopes. For the example provided in the previous answer, you'll need the following scopes:

- app_mentions:read
- channels:history
- chat:write
- groups:history
- groups:read
- users:write
- users:read

11. Scroll up to the "OAuth Tokens for Your Workspace" section and click the "Install App to Workspace" button. Grant the requested permissions.
12. After installing the app, you'll see the "Bot User OAuth Token" under "OAuth Tokens for Your Workspace." Copy this token and use it as your SLACK_BOT_TOKEN.

To enable Socket Mode, follow these additional steps:

1. From the left sidebar, click on "Socket Mode" under "Settings."
2. Enable Socket Mode by toggling the switch.
3. Click the "Generate Token" button to generate an App-Level token with the connections:write scope. Copy this token and use it as your SLACK_APP_TOKEN.

Now you have created a Slack bot and have the necessary tokens to use with the example code provided earlier. Make sure to invite the bot to the channels where you want it to be active by typing `/invite @your-bot-username` in those channels.

## FAQ

### Why is my bot not listening for messages?

Make sure you have set whitelisted channels in your `.env` file.

You can get Channel IDs by right-clicking on a channel in the side bar and click **Copy link** here:

<img width="538" alt="Slack 2023-03-18 at 01 01 03@2x" src="https://user-images.githubusercontent.com/10830749/225970561-e16d585b-ee9e-4f9e-ab15-276932316731.png">

For example the link for mine is:

```
https://zolplay.slack.com/archives/C04F7ML901G
```

Which means the Channel ID is `C04F7ML901G`

```
SLACK_WHITELISTED_CHANNELS="C04F7ML901G"
```

If you want the bot to listen for multiple channels, you can separate the channel IDs by commas like this:

```
SLACK_WHITELISTED_CHANNELS="C04F7ML901G,C04F7ML901Z,C04F7ML901D"
```
