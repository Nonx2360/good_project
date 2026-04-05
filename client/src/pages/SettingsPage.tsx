import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSettings, updateSettings, testDiscord } from '../api';
import { Save, BellDot, CheckCircle2, AlertCircle, ExternalLink, Send, Globe, Layout } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [webhookActive, setWebhookActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadSettings();
    
    // Check for OAuth callbacks
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
      if (data.client_secret) setClientSecret('********'); // mask it
      if (data.webhook_active) setWebhookActive(true);
    } catch (e) {
      toast.error(t('settings.toastLoadFail'));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: any = { client_id: clientId };
      if (clientSecret && clientSecret !== '********') {
        payload.client_secret = clientSecret;
      }
      await updateSettings(payload);
      toast.success(t('settings.toastSaveSuccess'));
      loadSettings();
    } catch (e) {
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
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full space-y-8">
      <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
        <Layout className="text-indigo-500 w-6 h-6 md:w-8 md:h-8" /> 
        {t('sidebar.settings')}
      </h2>

      {/* Language Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg md:text-xl font-semibold">{t('settings.langCardTitle')}</h3>
        </div>
        
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('settings.labelLanguage')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                language === 'en'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20'
                  : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200'
              }`}
            >
              🇺🇸 {t('settings.en')}
            </button>
            <button
              onClick={() => setLanguage('th')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                language === 'th'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20'
                  : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200'
              }`}
            >
              🇹🇭 {t('settings.th')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Discord Integration */}
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BellDot className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg md:text-xl font-semibold">{t('settings.discordCardTitle')}</h3>
          </div>
          {webhookActive ? (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
               <CheckCircle2 className="w-4 h-4" /> {t('settings.connected')}
            </span>
          ) : (
             <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full border border-slate-200">
                <AlertCircle className="w-4 h-4" /> {t('settings.notConnected')}
            </span>
          )}
        </div>
        
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
          {t('settings.discordDesc')}
        </p>
        
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('settings.labelClientId')}
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 123456789012345678"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-transparent transition-all outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('settings.labelClientSecret')}
            </label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="e.g. xxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-transparent transition-all outline-none font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center justify-center auto gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 px-6 py-3 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading ? t('settings.btnSaving') : t('settings.btnSaveCreds')}
          </button>
          
          <button
            onClick={handleConnectDiscord}
            className="flex flex-1 items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50"
          >
            <ExternalLink className="w-5 h-5" />
            {t('settings.btnConnectDiscord')}
          </button>

          {webhookActive && (
            <button
              onClick={handleTestNotification}
              title={t('settings.btnTest')}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-md"
            >
              <Send className="w-5 h-5" />
              {t('settings.btnTest')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
