import React, { useState, useEffect } from "react";
import styles from "./UnlockScreen.module.css";

interface UnlockScreenProps {
  onUnlocked: () => void;
}

const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlocked }) => {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0) return;

    try {
      const result = await window.api.unlockVault(passphrase);
      if (result.ok) {
        onUnlocked();
      } else {
        setError(result.error || "Incorrect passphrase");
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPassphrase("");

        if (nextAttempts >= 5) {
          setCooldown(30);
          setAttempts(0);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  const handleImport = async () => {
    try {
      const result = await window.api.importVault();
      if (result.ok) {
        alert("Vault imported successfully!");
        onUnlocked(); // Effectively reload
      } else if (!result.cancelled) {
        setError(result.error || "Failed to import vault");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during import");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>🔒</div>
        <h1 className={styles.title}>NoteVault</h1>
        <p className={styles.subtitle}>Your vault is encrypted.</p>

        <form onSubmit={handleUnlock} className={styles.form}>
          <input
            type="password"
            placeholder="Enter passphrase..."
            className={`${styles.input} ${error ? styles.inputError : ""}`}
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
              setError("");
            }}
            disabled={cooldown > 0}
            autoFocus
          />

          <button
            type="submit"
            className={styles.button}
            disabled={cooldown > 0 || !passphrase}
          >
            {cooldown > 0 ? `Try again in ${cooldown}s` : "Unlock"}
          </button>
        </form>

        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.footer}>
          Forgot passphrase?{" "}
          <button className={styles.link} onClick={handleImport}>
            Import backup
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnlockScreen;
