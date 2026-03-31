import { shell } from 'electron';
import http from 'node:http';
import url from 'node:url';
import crypto from 'node:crypto';
import { AuthState } from '../../shared/types';
import { storageService } from './StorageService';
import { cryptoService } from './CryptoService';

// In a real app, this would be in an environment variable
const GOOGLE_CLIENT_ID = '332906471380-v99b9v1g7m7n1m1v99b9v1g7m7n1m1.apps.googleusercontent.com'; // Placeholder
const REDIRECT_PORT = 42813;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}`;

export class AuthService {
  private auth: AuthState | null = null;

  constructor() {
    this.auth = storageService.getAuth() || null;
  }

  getStoredAuth(): AuthState | null {
    return this.auth;
  }

  isSignedIn(): boolean {
    return !!this.auth && this.auth.expiresAt > Date.now();
  }

  async signIn(): Promise<AuthState> {
    const codeVerifier = crypto.randomBytes(64).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/drive.appdata email openid profile');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        const query = url.parse(req.url || '', true).query;
        if (query.code) {
          try {
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                code: query.code as string,
                code_verifier: codeVerifier,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
              }),
            });
            const tokens = await tokenResponse.json();
            
            if (tokens.error) {
                throw new Error(tokens.error_description || tokens.error);
            }

            const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            const userInfo = await userResponse.json();

            const auth: AuthState = {
              provider: 'google',
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: Date.now() + tokens.expires_in * 1000,
              email: userInfo.email,
              userId: userInfo.sub,
            };

            this.auth = auth;
            storageService.setAuth(auth);
            
            // Set account-derived key
            // For multi-device sync to work, info string must be identical on all devices.
            // Using userId + a fixed app string for cross-device consistency.
            // (Ignoring machineId for now to fulfill "multi-device union" requirement)
            cryptoService.setKeyFromAccount(auth.userId, '');

            res.end('Authentication successful! You can close this window.');
            server.close();
            resolve(auth);
          } catch (err) {
            res.end(`Authentication failed: ${err}`);
            server.close();
            reject(err);
          }
        } else {
          res.end('Waiting for authorization code...');
        }
      });

      server.listen(REDIRECT_PORT, () => {
        shell.openExternal(authUrl.toString());
      });
    });
  }

  async signOut(): Promise<void> {
    if (!this.auth) return;
    
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${this.auth.accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (e) {
      console.warn('Failed to revoke tokens on Google:', e);
    }

    this.auth = null;
    storageService.setAuth(undefined);
    cryptoService.lock();
  }

  async refreshIfNeeded(): Promise<string> {
    if (!this.auth) throw new Error('Not signed in');
    if (this.auth.expiresAt > Date.now() + 60000) return this.auth.accessToken;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        refresh_token: this.auth.refreshToken,
        grant_type: 'refresh_token',
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
