import { shell } from "electron";
import http from "node:http";
import url from "node:url";
import crypto from "node:crypto";
import { AuthState } from "../../shared/types";
import { storageService } from "./StorageService";
import { cryptoService } from "./CryptoService";

// Hardcoded defaults removed for security.
// Credentials should be provided via settings in the UI.
const REDIRECT_PORT = 42813;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}`;

export class AuthService {
  private auth: AuthState | null = null;
  private activeServer: http.Server | null = null;
  private authTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.auth = storageService.getAuth() || null;
  }

  private getGoogleConfig() {
    const settings = storageService.getSettings();
    if (!settings.googleClientId || !settings.googleClientSecret) {
      throw new Error("Google Drive credentials not configured in settings.");
    }
    return {
      clientId: settings.googleClientId,
      clientSecret: settings.googleClientSecret,
    };
  }

  async testConfig(clientId: string, clientSecret: string): Promise<boolean> {
    if (!clientId || !clientSecret) return false;
    try {
      // Basic validation: try to construct the auth URL
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.append("client_id", clientId);
      authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append(
        "scope",
        "https://www.googleapis.com/auth/drive.appdata email openid profile",
      );

      // We can't really "test" without a real browser flow unless we do a discovery doc fetch
      const discoveryRes = await fetch(
        "https://accounts.google.com/.well-known/openid-configuration",
      );
      return discoveryRes.ok;
    } catch (e) {
      console.error("[AuthService] Config validation failed:", e);
      return false;
    }
  }

  getStoredAuth(): AuthState | null {
    return this.auth;
  }

  isSignedIn(): boolean {
    return !!this.auth && this.auth.expiresAt > Date.now();
  }

  async signIn(): Promise<AuthState> {
    const { clientId, clientSecret } = this.getGoogleConfig();
    const codeVerifier = crypto.randomBytes(64).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append(
      "scope",
      "https://www.googleapis.com/auth/drive.appdata email openid profile",
    );
    authUrl.searchParams.append("code_challenge", codeChallenge);
    authUrl.searchParams.append("code_challenge_method", "S256");

    // Cleanup logic helper
    const cleanup = () => {
      if (this.authTimeout) {
        clearTimeout(this.authTimeout);
        this.authTimeout = null;
      }
      if (this.activeServer) {
        this.activeServer.close();
        this.activeServer = null;
      }
    };

    // Cancel any existing session
    cleanup();

    return new Promise((resolve, reject) => {
      this.activeServer = http.createServer(async (req, res) => {
        const query = url.parse(req.url || "", true).query;

        if (query.error) {
          const errorMsg = Array.isArray(query.error)
            ? query.error[0]
            : query.error;
          res.end(`Authentication failed: ${errorMsg}`);
          cleanup();
          reject(new Error(errorMsg));
          return;
        }

        if (query.code) {
          try {
            const tokenResponse = await fetch(
              "https://oauth2.googleapis.com/token",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  client_id: clientId,
                  client_secret: clientSecret,
                  code: query.code as string,
                  code_verifier: codeVerifier,
                  grant_type: "authorization_code",
                  redirect_uri: REDIRECT_URI,
                }),
              },
            );
            const tokens = await tokenResponse.json();

            if (tokens.error) {
              throw new Error(tokens.error_description || tokens.error);
            }

            const userResponse = await fetch(
              "https://www.googleapis.com/oauth2/v3/userinfo",
              {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
              },
            );
            const userInfo = await userResponse.json();

            const auth: AuthState = {
              provider: "google",
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: Date.now() + tokens.expires_in * 1000,
              email: userInfo.email,
              userId: userInfo.sub,
            };

            this.auth = auth;
            storageService.setAuth(auth);

            // Set account-derived key
            cryptoService.setKeyFromAccount(auth.userId, "");

            res.end("Authentication successful! You can close this window.");
            cleanup();
            resolve(auth);
          } catch (err: any) {
            res.end(`Authentication failed: ${err.message || err}`);
            cleanup();
            reject(err);
          }
        } else {
          res.end("Waiting for authorization code...");
        }
      });

      this.activeServer.listen(REDIRECT_PORT, () => {
        shell.openExternal(authUrl.toString());
      });

      // 5-minute timeout
      this.authTimeout = setTimeout(
        () => {
          if (this.activeServer) {
            cleanup();
            reject(new Error("Sign-in timeout after 5 minutes."));
          }
        },
        5 * 60 * 1000,
      );
    });
  }

  async signOut(): Promise<void> {
    if (!this.auth) return;

    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${this.auth.accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );
    } catch (e) {
      console.warn("Failed to revoke tokens on Google:", e);
    }

    this.auth = null;
    storageService.setAuth(undefined);
    cryptoService.lock();
  }

  async refreshIfNeeded(): Promise<string> {
    if (!this.auth) throw new Error("Not signed in");
    if (this.auth.expiresAt > Date.now() + 60000) return this.auth.accessToken;

    const { clientId, clientSecret } = this.getGoogleConfig();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.auth.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const tokens = await response.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    this.auth = {
      ...this.auth,
      accessToken: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    storageService.setAuth(this.auth);
    return this.auth.accessToken;
  }
}

export const authService = new AuthService();
