import { google } from "googleapis";

const requiredIdentityScopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const defaultScopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks.readonly",
  ...requiredIdentityScopes,
];

const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    const errorPrefix = key.startsWith("GOOGLE_")
      ? "Google OAuth Configuration Error: "
      : "";
    throw new Error(`${errorPrefix}Missing required environment variable: ${key}. Please check your .env file.`);
  }
  return value;
};

const getGoogleScopes = () => {
  const raw = process.env.GOOGLE_SCOPES;
  const parsed = raw
    ? raw
        .split(",")
        .map((scope) => scope.trim())
        .filter(Boolean)
    : defaultScopes;

  for (const scope of requiredIdentityScopes) {
    if (!parsed.includes(scope)) {
      parsed.push(scope);
    }
  }

  return parsed;
};

const createGoogleOAuthClient = () => {
  const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getRequiredEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = getRequiredEnv("GOOGLE_REDIRECT_URI");

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

const encodeGoogleState = (state: Record<string, string>) =>
  Buffer.from(JSON.stringify(state)).toString("base64url");

const decodeGoogleState = (state?: string) => {
  if (!state) {
    return null;
  }
  try {
    const json = Buffer.from(state, "base64url").toString("utf-8");
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return null;
  }
};

const getGoogleAuthUrl = (state: Record<string, string>) => {
  const oauth2Client = createGoogleOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: getGoogleScopes(),
    state: encodeGoogleState(state),
  });
};

export {
  createGoogleOAuthClient,
  decodeGoogleState,
  getGoogleAuthUrl,
  getGoogleScopes,
};
