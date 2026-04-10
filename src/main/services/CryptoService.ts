import crypto from "node:crypto";
import { promisify } from "node:util";
import { Tab } from "../../shared/types";
import StorageService from "./StorageService";

const pbkdf2 = promisify(crypto.pbkdf2);

class CryptoService {
  private key: Buffer | null = null;
  private salt: Buffer | null = null;
  private iterations = 310000;

  async init(storedSalt?: string) {
    if (storedSalt) {
      this.salt = Buffer.from(storedSalt, "base64");
    } else {
      this.salt = crypto.randomBytes(16);
    }
  }

  getSalt(): string {
    if (!this.salt) throw new Error("CryptoService not initialized");
    return this.salt.toString("base64");
  }

  async unlock(passphrase: string): Promise<void> {
    if (!this.salt) throw new Error("CryptoService not initialized");

    // Derive key using PBKDF2-SHA256
    const derivedKey = await pbkdf2(
      passphrase,
      this.salt,
      this.iterations,
      32,
      "sha256",
    );
    this.key = derivedKey;
  }

  setKeyFromAccount(_userId: string, _machineId: string): void {
    // Phase 3 implementation hook
    const info = `${_userId}${_machineId}notevault-v1`;
    this.key = Buffer.from(crypto.hkdfSync("sha256", info, "", "", 32));
  }

  isUnlocked(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    if (!this.key) throw new Error("Vault is locked");

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);

    let ciphertext = cipher.update(plaintext, "utf8", "base64");
    ciphertext += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    // Stored as: base64( iv[12] || authTag[16] || ciphertext )
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(ciphertext, "base64"),
    ]);

    return combined.toString("base64");
  }

  decrypt(base64Ciphertext: string): string {
    if (!this.key) throw new Error("Vault is locked");

    const combined = Buffer.from(base64Ciphertext, "base64");

    // iv[0:12], authTag[12:28], ciphertext[28:]
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(authTag);

    // Ciphertext is now a Buffer, update takes Buffer as input
    let plaintext = decipher.update(ciphertext, undefined, "utf8");
    plaintext += decipher.final("utf8");

    return plaintext;
  }

  async rotateKey(
    newPassphrase: string,
    tabs: Tab[],
    storage: StorageService,
  ): Promise<void> {
    if (!this.isUnlocked()) throw new Error("Must unlock before rotating key");

    // 1. Decrypt all currently encrypted tabs using OLD key
    const decryptedTabsContent = tabs
      .map((tab) => {
        if (tab.encrypted) {
          try {
            return { id: tab.id, content: this.decrypt(tab.content) };
          } catch (e) {
            console.error(`Failed to decrypt tab ${tab.id} during rotation`, e);
            return null;
          }
        }
        return null;
      })
      .filter((t) => t !== null) as { id: string; content: string }[];

    // 2. Generate NEW salt and derive NEW key
    this.salt = crypto.randomBytes(16);
    await this.unlock(newPassphrase);

    // 3. Re-encrypt those tabs with NEW key
    const updatedTabs = tabs.map((tab) => {
      const decrypted = decryptedTabsContent.find((d) => d.id === tab.id);
      if (decrypted) {
        return { ...tab, content: this.encrypt(decrypted.content) };
      }
      return tab;
    });

    // 4. Update storage with re-encrypted tabs
    storage.setTabs(updatedTabs);
  }

  lock(): void {
    if (this.key) {
      this.key.fill(0);
      this.key = null;
    }
  }
}

export const cryptoService = new CryptoService();
export default CryptoService;
