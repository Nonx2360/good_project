import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSettings, updateSettings, testDiscord } from '../api';
import { Save, BellDot, CheckCircle2, AlertCircle, ExternalLink, Send, Globe } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [webhookActive, setWebhookActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadSettings();
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success) {
      toast.success(t('settings.toastOAuthSuccess'));
      setSearchParams({});
    } else if (error) {
      toast.error(t('settings.toastOAuthFail', { error }));
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, t]);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      if (data.client_id) setClientId(data.client_id);
      if (data.client_secret) setClientSecret('••••••••');
      if (data.webhook_active) setWebhookActive(true);
    } catch {
      toast.error(t('settings.toastLoadFail'));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { client_id: clientId };
      if (clientSecret && clientSecret !== '••••••••') {
        payload.client_secret = clientSecret;
      }
      await updateSettings(payload);
      toast.success(t('settings.toastSaveSuccess'));
      loadSettings();
    } catch {
      toast.error(t('settings.toastSaveFail'));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDiscord = () => {
    if (!clientId) {
      toast.error(t('settings.toastNoClientId'));
      return;
    }
    window.location.href = 'http://localhost:3001/api/discord/auth';
  };

  const handleTestNotification = async () => {
    try {
      await testDiscord();
      toast.success(t('settings.toastTestSuccess'));
    } catch (e: any) {
      toast.error(e.response?.data?.error || t('settings.toastTestFail'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Page Header */}
      <header className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="page-title">{t('sidebar.settings')}</h1>
          <p className="page-subtitle">Configure integrations and display preferences.</p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 680 }}>

        {/* ── Language Settings ── */}
        <section
          aria-labelledby="lang-section-title"
          className="widget"
        >
          <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <Globe size={16} style={{ color: 'var(--color-text-tertiary)' }} aria-hidden="true" />
            <h2
              id="lang-section-title"
              style={{ fontSize: 'var(--font-size-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}
            >
              {t('settings.langCardTitle')}
            </h2>
          </header>

          <div>
            <p
              className="form-label"
              id="lang-group-label"
              style={{ marginBottom: 'var(--space-3)' }}
            >
              {t('settings.labelLanguage')}
            </p>
            <div
              role="group"
              aria-labelledby="lang-group-label"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}
            >
              {(['en', 'th'] as const).map(lang => {
                const isActive = language === lang;
                return (
                  <button
                    key={lang}
                    id={`lang-${lang}`}
                    onClick={() => setLanguage(lang)}
                    aria-pressed={isActive}
                    aria-label={`Set language to ${t(`settings.${lang}`)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-3)',
                      fontFamily: 'var(--font-family-mono)',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${isActive ? 'var(--color-border-active)' : 'var(--color-border)'}`,
                      background: isActive ? 'var(--color-bg-elevated)' : 'transparent',
                      color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {lang === 'en' ? '🇺🇸' : '🇹🇭'} {t(`settings.${lang}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Discord Integration ── */}
        <section
          aria-labelledby="discord-section-title"
          className="widget"
        >
          <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-5)',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <BellDot size={16} style={{ color: 'var(--color-text-tertiary)' }} aria-hidden="true" />
              <h2
                id="discord-section-title"
                style={{ fontSize: 'var(--font-size-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}
              >
                {t('settings.discordCardTitle')}
              </h2>
            </div>

            {webhookActive ? (
              <span
                className="badge badge--neutral"
                role="status"
                aria-label="Discord connected"
                style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border-active)' }}
              >
                <CheckCircle2 size={9} aria-hidden="true" />
                {t('settings.connected')}
              </span>
            ) : (
              <span
                className="badge badge--neutral"
                role="status"
                aria-label="Discord not connected"
              >
                <AlertCircle size={9} aria-hidden="true" />
                {t('settings.notConnected')}
              </span>
            )}
          </header>

          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-5)',
            lineHeight: 1.6,
          }}>
            {t('settings.discordDesc')}
          </p>

          {/* Credentials form — proper <form> element for password field */}
          <form onSubmit={handleSave} aria-label="Discord credentials form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="field-client-id">
                  {t('settings.labelClientId')}
                </label>
                <input
                  id="field-client-id"
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="e.g. 123456789012345678"
                  className="form-input"
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="field-client-secret">
                  {t('settings.labelClientSecret')}
                </label>
                <input
                  id="field-client-secret"
                  type="password"
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••"
                  className="form-input"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Actions — responsive row/column */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}>
              <button
                id="btn-save-creds"
                type="submit"
                disabled={loading}
                className="btn btn--secondary"
                aria-label={loading ? t('settings.btnSaving') : t('settings.btnSaveCreds')}
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                <Save size={14} aria-hidden="true" />
                {loading ? t('settings.btnSaving') : t('settings.btnSaveCreds')}
              </button>

              <button
                id="btn-connect-discord"
                type="button"
                onClick={handleConnectDiscord}
                className="btn btn--primary"
                aria-label={t('settings.btnConnectDiscord')}
              >
                <ExternalLink size={14} aria-hidden="true" />
                {t('settings.btnConnectDiscord')}
              </button>

              {webhookActive && (
                <button
                  id="btn-test-notification"
                  type="button"
                  onClick={handleTestNotification}
                  className="btn btn--secondary"
                  aria-label={t('settings.btnTest')}
                >
                  <Send size={14} aria-hidden="true" />
                  {t('settings.btnTest')}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </motion.div>
  );
}
