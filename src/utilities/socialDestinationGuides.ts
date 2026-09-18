import type { SocialPlatformType } from '@/utilities/socialPlatforms';

export type SetupStep = {
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
};

export type OAuthRequires =
  | 'clientId'
  | 'clientSecret'
  | 'apiKey'
  | 'apiSecret'
  | 'instanceUrl';

export type PlatformSetupGuide = {
  type: SocialPlatformType;
  summary: string;
  /** Primary docs / console link */
  docsUrl?: string;
  docsLabel?: string;
  steps: SetupStep[];
  /** Field names the user must fill (for checklist) */
  fieldsNeeded: string[];
  /** When set, the setup UI can offer an Authorize button */
  oauth?: {
    requires: OAuthRequires[];
    authorizeLabel: string;
    hint: string;
  };
};

/**
 * Click-by-click setup help for every social destination.
 * Keep copy practical: where to click, what to paste, and which CMS fields map.
 */
export const PLATFORM_SETUP_GUIDES: Record<SocialPlatformType, PlatformSetupGuide> = {
  discord: {
    type: 'discord',
    summary: 'Create an Incoming Webhook for a channel, then paste the URL here.',
    docsUrl: 'https://discord.com/developers/docs/resources/webhook#create-webhook',
    docsLabel: 'Discord webhook docs',
    fieldsNeeded: ['webhookUrl'],
    steps: [
      {
        title: 'Open channel settings',
        body: 'In Discord, open the target server → the channel → Edit Channel (gear).',
      },
      {
        title: 'Create webhook',
        body: 'Integrations → Webhooks → New Webhook. Name it (e.g. “CMS announce”), optionally set an avatar, then Copy Webhook URL.',
        href: 'https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks',
        hrefLabel: 'Discord webhook help',
      },
      {
        title: 'Paste into CMS',
        body: 'Paste the URL into Webhook URL below, save, then Send test message.',
      },
    ],
  },
  slack: {
    type: 'slack',
    summary: 'Add an Incoming Webhook to a Slack channel and paste the URL.',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    docsLabel: 'Slack Incoming Webhooks',
    fieldsNeeded: ['webhookUrl'],
    steps: [
      {
        title: 'Open Slack apps',
        body: 'Go to Your Apps and create or select an app for your workspace.',
        href: 'https://api.slack.com/apps',
        hrefLabel: 'api.slack.com/apps',
      },
      {
        title: 'Enable Incoming Webhooks',
        body: 'Incoming Webhooks → On → Add New Webhook to Workspace → pick the channel → Allow. Copy the webhook URL.',
      },
      {
        title: 'Paste into CMS',
        body: 'Paste into Webhook URL, save, then Send test message.',
      },
    ],
  },
  reddit: {
    type: 'reddit',
    summary:
      'Create a Reddit script app, enter client id/secret, authorize once to get a refresh token, then set the subreddit.',
    docsUrl: 'https://www.reddit.com/prefs/apps',
    docsLabel: 'Reddit app preferences',
    fieldsNeeded: ['clientId', 'clientSecret', 'refreshToken', 'subreddit'],
    oauth: {
      requires: ['clientId', 'clientSecret'],
      authorizeLabel: 'Authorize with Reddit',
      hint: 'Save client id + secret first, then authorize. We store the refresh token automatically.',
    },
    steps: [
      {
        title: 'Create a Reddit app',
        body: 'prefs → apps → “create another app…” → type script. Name it, set redirect uri to the callback shown below (copy from the Authorize panel).',
        href: 'https://www.reddit.com/prefs/apps',
        hrefLabel: 'reddit.com/prefs/apps',
      },
      {
        title: 'Copy credentials',
        body: 'Under the app name is the client id. “secret” is the client secret. Paste both into this row and save.',
      },
      {
        title: 'Authorize',
        body: 'Click Authorize with Reddit, approve submit access. We save the refresh token. Then set Subreddit (without r/) and test.',
      },
    ],
  },
  x: {
    type: 'x',
    summary:
      'Use a developer app. Prefer OAuth 2.0 user token (Authorize), or OAuth 1.0a keys if you already have them.',
    docsUrl: 'https://developer.x.com/en/portal/dashboard',
    docsLabel: 'X Developer Portal',
    fieldsNeeded: ['clientId', 'clientSecret', 'accessToken'],
    oauth: {
      requires: ['clientId', 'clientSecret'],
      authorizeLabel: 'Authorize with X',
      hint: 'App must allow the CMS callback URL. We store a user access token for posting.',
    },
    steps: [
      {
        title: 'Create a project & app',
        body: 'In the X Developer Portal, create a Project + App with Read and Write. Note Client ID and Client Secret (OAuth 2.0).',
        href: 'https://developer.x.com/en/portal/dashboard',
        hrefLabel: 'Developer Portal',
      },
      {
        title: 'Set callback URL',
        body: 'App settings → User authentication → set Type to Web App, add the CMS OAuth callback URL from the Authorize panel, enable Read and Write.',
      },
      {
        title: 'Authorize or paste tokens',
        body: 'Paste client id/secret, save, Authorize with X — or paste an existing Bearer / OAuth 1.0a access token + secrets into the fields below.',
      },
    ],
  },
  bluesky: {
    type: 'bluesky',
    summary: 'Use your handle plus an app password (not your main password).',
    docsUrl: 'https://bsky.app/settings/app-passwords',
    docsLabel: 'Bluesky app passwords',
    fieldsNeeded: ['handle', 'appPassword'],
    steps: [
      {
        title: 'Create an app password',
        body: 'Settings → Privacy and security → App passwords → Add. Name it “CMS” and copy the generated password.',
        href: 'https://bsky.app/settings/app-passwords',
        hrefLabel: 'bsky.app/settings/app-passwords',
      },
      {
        title: 'Fill CMS fields',
        body: 'Handle like you.bsky.social (or custom domain), paste App password, save, test.',
      },
    ],
  },
  mastodon: {
    type: 'mastodon',
    summary:
      'Point at your instance, then Authorize — we register an app on that instance and store an access token.',
    docsUrl: 'https://docs.joinmastodon.org/client/authorized/',
    docsLabel: 'Mastodon OAuth docs',
    fieldsNeeded: ['instanceUrl', 'accessToken'],
    oauth: {
      requires: ['instanceUrl'],
      authorizeLabel: 'Authorize with Mastodon',
      hint: 'Enter instance URL (e.g. https://mastodon.social), save, then authorize. Client id/secret are created for you.',
    },
    steps: [
      {
        title: 'Pick your instance',
        body: 'Set Instance URL to your Mastodon host including https:// (no trailing path). Save the row.',
      },
      {
        title: 'Authorize',
        body: 'Click Authorize with Mastodon, approve write:statuses. We store the access token. You can also paste a token from Preferences → Development if you prefer.',
        href: 'https://mastodon.social/settings/applications',
        hrefLabel: 'Example: applications settings',
      },
    ],
  },
  facebook: {
    type: 'facebook',
    summary: 'Post as a Page with a long-lived Page access token and the Page ID.',
    docsUrl: 'https://developers.facebook.com/tools/explorer/',
    docsLabel: 'Graph API Explorer',
    fieldsNeeded: ['pageId', 'accessToken'],
    steps: [
      {
        title: 'Create / open a Meta app',
        body: 'In Meta for Developers, create an app (Business type) and add Facebook Login / pages permissions as needed.',
        href: 'https://developers.facebook.com/apps/',
        hrefLabel: 'developers.facebook.com/apps',
      },
      {
        title: 'Get a Page token',
        body: 'Graph API Explorer → select your app → Get Token → Get Page Access Token → pick the Page. Extend it to long-lived (60 days) via Access Token Debugger / exchange.',
        href: 'https://developers.facebook.com/tools/explorer/',
        hrefLabel: 'Graph API Explorer',
      },
      {
        title: 'Page ID + paste',
        body: 'Page ID is in Page → About or from the token debug response. Paste Page ID and Access token, save, test.',
      },
    ],
  },
  instagram: {
    type: 'instagram',
    summary:
      'Instagram Content Publishing needs a Business/Creator account linked to a Facebook Page, plus a token and the IG user id. Posts need an og:image on the public URL.',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/guides/content-publishing',
    docsLabel: 'Content publishing guide',
    fieldsNeeded: ['pageId', 'accessToken'],
    steps: [
      {
        title: 'Convert & link Instagram',
        body: 'Instagram account must be Professional (Business/Creator) and linked to a Facebook Page in Meta Business Suite.',
        href: 'https://www.facebook.com/business/help/898752960195806',
        hrefLabel: 'Link IG to a Page',
      },
      {
        title: 'Get IG user id + token',
        body: 'Use Graph API Explorer with instagram_basic, instagram_content_publish, pages_show_list. Resolve the Instagram Business Account id (this is Page ID in our field). Use a long-lived token.',
        href: 'https://developers.facebook.com/tools/explorer/',
        hrefLabel: 'Graph API Explorer',
      },
      {
        title: 'SEO image required',
        body: 'Announces pull og:image from the public page. Ensure articles/galleries have a social/SEO image before testing Instagram.',
      },
    ],
  },
  linkedin: {
    type: 'linkedin',
    summary: 'Create a LinkedIn app, authorize once, then set the author URN (person or organization).',
    docsUrl: 'https://www.linkedin.com/developers/apps',
    docsLabel: 'LinkedIn Developers',
    fieldsNeeded: ['clientId', 'clientSecret', 'accessToken', 'pageId'],
    oauth: {
      requires: ['clientId', 'clientSecret'],
      authorizeLabel: 'Authorize with LinkedIn',
      hint: 'Add the CMS callback under Auth → Redirect URLs. We store the access token; set Page ID to your person or org URN.',
    },
    steps: [
      {
        title: 'Create an app',
        body: 'LinkedIn Developers → Create app. Request Share on LinkedIn / Community Management products as required for posting.',
        href: 'https://www.linkedin.com/developers/apps',
        hrefLabel: 'linkedin.com/developers/apps',
      },
      {
        title: 'Auth settings',
        body: 'Auth tab → copy Client ID + Client Secret. Add the CMS OAuth callback URL. Scopes typically include w_member_social (and org scopes if posting as a company).',
      },
      {
        title: 'Authorize + author id',
        body: 'Paste client id/secret, save, Authorize. Then set Page ID to urn:li:person:… or urn:li:organization:… (from the token introspection / me endpoint).',
      },
    ],
  },
  threads: {
    type: 'threads',
    summary: 'Threads uses Meta Graph with a Threads user id and long-lived token.',
    docsUrl: 'https://developers.facebook.com/docs/threads',
    docsLabel: 'Threads API docs',
    fieldsNeeded: ['pageId', 'accessToken'],
    steps: [
      {
        title: 'Meta app + Threads product',
        body: 'Create/select a Meta app and add the Threads API product. Complete app review if required for production.',
        href: 'https://developers.facebook.com/apps/',
        hrefLabel: 'Meta apps',
      },
      {
        title: 'Token + user id',
        body: 'Generate a Threads access token for the account. Paste Access token and set Page ID to the Threads user id (or use Handle when supported). Save and test.',
        href: 'https://developers.facebook.com/docs/threads/get-started',
        hrefLabel: 'Get started',
      },
    ],
  },
  telegram: {
    type: 'telegram',
    summary: 'Create a bot with BotFather, add it to a channel/group, then paste bot token and chat id.',
    docsUrl: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
    docsLabel: 'Telegram bots intro',
    fieldsNeeded: ['botToken', 'chatId'],
    steps: [
      {
        title: 'Create the bot',
        body: 'Message @BotFather → /newbot → follow prompts → copy the HTTP API token into Bot token.',
        href: 'https://t.me/BotFather',
        hrefLabel: 'Open @BotFather',
      },
      {
        title: 'Add bot to channel/group',
        body: 'Add the bot as admin (channels) or member (groups) so it can post.',
      },
      {
        title: 'Chat id',
        body: 'For public channels use @channelusername. For private chats, forward a message to @userinfobot or call getUpdates after messaging the bot, then paste the numeric chat id.',
        href: 'https://core.telegram.org/bots/api#getupdates',
        hrefLabel: 'getUpdates docs',
      },
    ],
  },
  tumblr: {
    type: 'tumblr',
    summary: 'Register an OAuth 1.0a app and paste consumer + token credentials, plus the blog name.',
    docsUrl: 'https://www.tumblr.com/oauth/apps',
    docsLabel: 'Tumblr OAuth apps',
    fieldsNeeded: ['blogName', 'apiKey', 'apiSecret', 'accessToken', 'refreshToken'],
    steps: [
      {
        title: 'Register an application',
        body: 'Tumblr OAuth apps → Register. Copy OAuth Consumer Key (API key) and Consumer Secret (API secret).',
        href: 'https://www.tumblr.com/oauth/apps',
        hrefLabel: 'tumblr.com/oauth/apps',
      },
      {
        title: 'Generate user tokens',
        body: 'Use Tumblr’s OAuth 1.0a flow (or the “Explore API” tools) to obtain an Access Token and Token Secret. Paste token into Access token and token secret into Refresh token (we reuse that field for OAuth1 secrets).',
      },
      {
        title: 'Blog name',
        body: 'Blog name is the subdomain (myblog from myblog.tumblr.com). Save and test.',
      },
    ],
  },
  pinterest: {
    type: 'pinterest',
    summary:
      'Create a Pinterest app, authorize for a board token, set board id. Pins need an og:image on the public URL.',
    docsUrl: 'https://developers.pinterest.com/apps/',
    docsLabel: 'Pinterest Developers',
    fieldsNeeded: ['clientId', 'clientSecret', 'accessToken', 'boardId'],
    oauth: {
      requires: ['clientId', 'clientSecret'],
      authorizeLabel: 'Authorize with Pinterest',
      hint: 'Add the CMS callback in the app’s redirect URIs. Boards:read and pins:write scopes are typical.',
    },
    steps: [
      {
        title: 'Create an app',
        body: 'Pinterest Developers → Create app. Copy App ID (client id) and App secret.',
        href: 'https://developers.pinterest.com/apps/',
        hrefLabel: 'developers.pinterest.com/apps',
      },
      {
        title: 'Redirect URI + authorize',
        body: 'Add the CMS OAuth callback, paste client id/secret here, save, Authorize. We store the access token.',
      },
      {
        title: 'Board id + image',
        body: 'Set Board id from the board URL or API. Ensure the announced page has og:image or the pin will fail.',
      },
    ],
  },
  custom_webhook: {
    type: 'custom_webhook',
    summary: 'POST JSON to any HTTPS endpoint. Optional Bearer token for auth.',
    fieldsNeeded: ['webhookUrl'],
    steps: [
      {
        title: 'Prepare your endpoint',
        body: 'Your receiver should accept POST JSON with content, url, title, and collection. Return 2xx on success.',
      },
      {
        title: 'Paste URL (+ token)',
        body: 'Webhook URL is required. Optional Bearer token is sent as Authorization: Bearer …. Save and test.',
      },
    ],
  },
};

export function getPlatformSetupGuide(
  type: string | null | undefined,
): PlatformSetupGuide | null {
  if (!type || !(type in PLATFORM_SETUP_GUIDES)) return null;
  return PLATFORM_SETUP_GUIDES[type as SocialPlatformType];
}

/** Platforms that support in-admin OAuth authorize. */
export function platformSupportsOauth(type: string | null | undefined): boolean {
  return Boolean(getPlatformSetupGuide(type)?.oauth);
}
