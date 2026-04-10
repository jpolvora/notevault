import React, { useEffect, useState, useRef } from "react";
import { useUIStore } from "../../../store/ui";
import styles from "../Settings.module.css";

export const SyncSettings: React.FC = () => {
  const { settings, updateSettings } = useUIStore();
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkStatus = async () => {
    const status = await window.api.getAuthStatus();
    setAuthStatus(status);
    if (status?.email) {
      fetchBackups();
    }
  };

  const fetchBackups = async () => {
    try {
      const list = await window.api.listCloudBackups();
      setBackups(list);
    } catch (e) {
      console.error("Failed to fetch cloud backups:", e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (!settings) return null;

  const handleLogin = async () => {
    try {
      await window.api.login();
      checkStatus();
    } catch (e) {
      alert("Login failed: " + e);
    }
  };

  const handleLogout = async () => {
    await window.api.logout();
    checkStatus();
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await window.api.syncNow();
    setIsSyncing(false);
  };

  const handleTestConfig = async () => {
    setIsValidating(true);
    try {
      const success = await window.api.testGoogleConfig(
        settings.googleClientId || "",
        settings.googleClientSecret || "",
      );
      updateSettings({ googleConfigValidated: success });
      if (success) {
        alert("Configuration validated successfully!");
      } else {
        alert("Configuration validation failed. Please check your credentials.");
      }
    } catch (e) {
      alert("Validation error: " + e);
    } finally {
      setIsValidating(false);
    }
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const web = json.web || json.installed;
        if (web && web.client_id && web.client_secret) {
          updateSettings({
            googleClientId: web.client_id,
            googleClientSecret: web.client_secret,
            googleConfigValidated: false,
          });
          alert("Credentials loaded from JSON. Please test the configuration.");
        } else {
          alert("Invalid JSON format. Could not find client_id or client_secret.");
        }
      } catch (err) {
        alert("Failed to parse JSON: " + err);
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={styles.section}>
      <h2>Cloud Sync</h2>
      <p className={styles.description}>
        Securely sync your tabs across devices using your own Google Drive API credentials.
      </p>

      <div className={styles.section}>
        <h3>1. API Configuration</h3>
        <p className={styles.description}>
          Provide your Google Cloud Console credentials to enable cloud synchronization.
        </p>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>Client ID</label>
            <input
              type="text"
              value={settings.googleClientId || ""}
              onChange={(e) =>
                updateSettings({
                  googleClientId: e.target.value,
                  googleConfigValidated: false,
                })
              }
              placeholder="Enter Google Client ID"
              className={styles.input}
              style={{ width: "350px" }}
            />
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>Client Secret</label>
            <input
              type="password"
              value={settings.googleClientSecret || ""}
              onChange={(e) =>
                updateSettings({
                  googleClientSecret: e.target.value,
                  googleConfigValidated: false,
                })
              }
              placeholder="Enter Google Client Secret"
              className={styles.input}
              style={{ width: "350px" }}
            />
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>Upload Configuration</label>
            <span className={styles.description}>
              Import credentials from the client_secret_XXX.json file downloaded from Google Console.
            </span>
          </div>
          <input
            type="file"
            accept=".json"
            onChange={handleJsonUpload}
            ref={fileInputRef}
            style={{ display: "none" }}
          />
          <button className={styles.button} onClick={() => fileInputRef.current?.click()}>
            Upload JSON
          </button>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>Validation Status</label>
            <span className={styles.description}>
              {settings.googleConfigValidated
                ? "✅ Configuration Validated"
                : "❌ Not Validated"}
            </span>
          </div>
          <button
            className={isValidating ? styles.button : styles.primaryButton}
            onClick={handleTestConfig}
            disabled={isValidating || !settings.googleClientId || !settings.googleClientSecret}
          >
            {isValidating ? "Validating..." : "Test Configuration"}
          </button>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section} style={{ opacity: settings.googleConfigValidated ? 1 : 0.5 }}>
        <h3>2. Authentication & Sync</h3>
        
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>Google Account</label>
            <span className={styles.description}>
              {authStatus?.email
                ? `Signed in as ${authStatus.email}`
                : "Not signed in"}
            </span>
          </div>
          {authStatus?.email ? (
            <button className={styles.button} onClick={handleLogout}>
              Sign Out
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              onClick={handleLogin}
              disabled={!settings.googleConfigValidated}
            >
              Sign In with Google
            </button>
          )}
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>Enable Sync</label>
            <span className={styles.description}>
              Automatically push and pull changes.
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.syncEnabled}
            onChange={(e) => updateSettings({ syncEnabled: e.target.checked })}
            className={styles.checkbox}
            disabled={!authStatus?.email || !settings.googleConfigValidated}
          />
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>Sync Interval</label>
            <span className={styles.description}>
              How often to check for remote changes (default: 30s).
            </span>
          </div>
          <select
            value={settings.syncInterval}
            onChange={(e) =>
              updateSettings({ syncInterval: parseInt(e.target.value) })
            }
            className={styles.select}
            disabled={!settings.syncEnabled}
          >
            <option value="15000">15 Seconds</option>
            <option value="30000">30 Seconds</option>
            <option value="60000">1 Minute</option>
            <option value="300000">5 Minutes</option>
          </select>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>Sync Now</label>
            <span className={styles.description}>
              Force an immediate synchronization cycle.
            </span>
          </div>
          <button
            className={styles.button}
            onClick={handleSyncNow}
            disabled={!authStatus?.email || isSyncing || !settings.googleConfigValidated}
          >
            {isSyncing ? "Syncing..." : "Force Sync"}
          </button>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section} style={{ opacity: authStatus?.email ? 1 : 0.5 }}>
        <h3>Manual Cloud Backups</h3>
        <p className={styles.description}>
          Create or restore full vault snapshots on Google Drive.
        </p>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label>New Cloud Backup</label>
            <span className={styles.description}>
              Save all tabs and settings to a new .nvault file.
            </span>
          </div>
          <button
            className={styles.primaryButton}
            onClick={async () => {
              try {
                await window.api.backupToCloud();
                alert("Backup created successfully!");
                fetchBackups();
              } catch (e) {
                alert("Failed to create backup: " + e);
              }
            }}
            disabled={!authStatus?.email}
          >
            Create Backup
          </button>
        </div>

        <div className={styles.backupList}>
          {backups.length > 0 ? (
            backups.map((b) => (
              <div key={b.id} className={styles.backupItem}>
                <div className={styles.backupInfo}>
                  <span className={styles.backupName}>{b.name}</span>
                  <span className={styles.backupDate}>
                    {new Date(b.createdTime).toLocaleString()}
                  </span>
                </div>
                <button
                  className={styles.button}
                  onClick={async () => {
                    if (
                      confirm(
                        "Restore this backup? Current tabs will be merged.",
                      )
                    ) {
                      try {
                        const count = await window.api.restoreFromCloud(b.id);
                        alert(`Restored ${count} tabs successfully!`);
                      } catch (e) {
                        alert("Restore failed: " + e);
                      }
                    }
                  }}
                >
                  Restore
                </button>
              </div>
            ))
          ) : (
            <p className={styles.description}>No manual backups found.</p>
          )}
        </div>
      </div>
    </div>
  );
};
