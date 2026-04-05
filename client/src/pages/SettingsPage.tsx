import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSettings, updateSettings, testDiscord } from '../api';
import { Save, BellDot, CheckCircle2, AlertCircle, ExternalLink, Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function SettingsPage() {
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
      toast.success('Successfully connected to Discord!');
      setSearchParams({});
    } else if (error) {
      toast.error(`Discord connection failed: ${error}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      if (data.client_id) setClientId(data.client_id);
      if (data.client_secret) setClientSecret('********'); // mask it
      if (data.webhook_active) setWebhookActive(true);
    } catch (e) {
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Don't send back the mask
      const payload: any = { client_id: clientId };
      if (clientSecret && clientSecret !== '********') {
        payload.client_secret = clientSecret;
      }
      await updateSettings(payload);
      toast.success('OAuth credentials saved successfully');
      loadSettings();
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDiscord = () => {
    if (!clientId) {
      toast.error('Please save your Client ID first');
      return;
    }
    // Redirect user to backend OAuth startup
    window.location.href = 'http://localhost:3001/api/discord/auth';
  };

  const handleTestNotification = async () => {
    try {
      await testDiscord();
      toast.success('Test notification sent!');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to send test notification');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 flex items-center gap-3">
        <BellDot className="text-indigo-500 w-6 h-6 md:w-8 md:h-8" /> 
        Notification Settings
      </h2>
      
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-semibold">Discord Integrations (OAuth2)</h3>
          {webhookActive ? (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
               <CheckCircle2 className="w-4 h-4" /> Connected
            </span>
          ) : (
             <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full border border-slate-200">
               <AlertCircle className="w-4 h-4" /> Not Connected
            </span>
          )}
        </div>
        
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
          Instead of using Webhooks manually, integrate your Discord App. Enter your Client ID and Client Secret from the Discord Developer Portal. Then, use the button to securely select a channel for the bot to notify regarding expired parts.
        </p>
        
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Discord Client ID
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
              Discord Client Secret
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
            {loading ? 'Saving...' : 'Save Credentials'}
          </button>
          
          <button
            onClick={handleConnectDiscord}
            className="flex flex-1 items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50"
          >
            <ExternalLink className="w-5 h-5" />
            Connect Discord
          </button>

          {webhookActive && (
            <button
              onClick={handleTestNotification}
              title="Send Test Notification"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-md"
            >
              <Send className="w-5 h-5" />
              Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
