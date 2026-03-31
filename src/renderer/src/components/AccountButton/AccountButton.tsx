import React, { useState, useEffect } from 'react';
import styles from './AccountButton.module.css';

export const AccountButton: React.FC = () => {
  const [auth, setAuth] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const updateStatus = async () => {
    try {
      const status = await (window as any).api.getAuthStatus();
      setAuth(status.auth);
      const sync = await (window as any).api.getSyncStatus();
      setSyncStatus(sync);
    } catch (e) {
      console.error('Failed to get auth status:', e);
    }
  };

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const newAuth = await (window as any).api.login();
      setAuth(newAuth);
    } catch (e) {
      console.error('Sign in failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Sign out from Google? Local encryption will revert to passphrase mode.')) {
        await (window as any).api.logout();
        setAuth(null);
    }
  };

  if (!auth) {
    return (
      <button 
        className={styles.signInBtn} 
        onClick={handleSignIn}
        disabled={loading}
      >
        {loading ? '↻ Connecting...' : 'Sign in'}
      </button>
    );
  }

  const lastSyncStr = syncStatus?.lastSyncAt 
    ? new Date(syncStatus.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Never';

  return (
    <div className={styles.container}>
      <span className={styles.syncInfo} title={`Last synced at ${lastSyncStr}`}>
        {syncStatus?.queueSize > 0 ? `⏸ Offline (${syncStatus.queueSize})` : `☁ Synced ${lastSyncStr}`}
      </span>
      <div className={styles.divider} />
      <button 
        className={styles.accountBtn} 
        onClick={handleSignOut}
        title={`Signed in as ${auth.email}. Click to sign out.`}
      >
        <span className={styles.email}>{auth.email.split('@')[0]}</span>
      </button>
    </div>
  );
};
