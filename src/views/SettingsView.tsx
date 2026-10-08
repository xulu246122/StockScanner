import { useState, useEffect } from 'react';
import { apiClient, getServerBaseUrl, setServerBaseUrl, isNativeMobile } from '../services/apiClient.ts';
import { wsClient } from '../services/websocketClient.ts';
import {
  ApiProviderConfig,
  DEFAULT_API_CONFIG,
  ApiProviderStatus,
  BrokerConfig,
  DEFAULT_BROKER_CONFIG,
  BrokerAccountSummary,
  NotificationChannelsConfig,
  DEFAULT_NOTIFICATION_CHANNELS_CONFIG,
  ChannelTestResult
} from '../types.ts';
import {
  Settings,
  Key,
  Database,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  Activity,
  Layers,
  Check,
  X,
  ExternalLink,
  Cpu,
  Radio,
  Server,
  DollarSign,
  TrendingUp,
  Sliders,
  Wallet,
  Compass,
  Bell,
  Send,
  MessageSquare,
  Monitor,
  Minimize2,
  Power,
  MousePointer,
  Circle,
  ChevronLeft,
  ShieldCheck,
  BatteryCharging
} from 'lucide-react';
import { backgroundAlertService, BackgroundDaemonConfig } from '../services/backgroundAlertService.ts';
import { useResponsive } from '../hooks/useResponsive.ts';

interface SettingsViewProps {
  onBack?: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const { isMobile } = useResponsive();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'DATA_API' | 'BROKER_ROUTING' | 'NOTIFICATIONS' | 'SYSTEM_PREF'>('DATA_API');

  // 1. Data API Config State
  const [config, setConfig] = useState<ApiProviderConfig>(JSON.parse(JSON.stringify(DEFAULT_API_CONFIG)));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Secret Key Visibility Toggles
  const [showFinnhub, setShowFinnhub] = useState(false);
  const [showMassive, setShowMassive] = useState(false);
  const [showAlphaVantage, setShowAlphaVantage] = useState(false);
  const [showAlpacaSecret, setShowAlpacaSecret] = useState(false);
  const [showTgToken, setShowTgToken] = useState(false);
  const [showBarkKey, setShowBarkKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Testing States
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);

  // 2. Broker Routing State (P2)
  const [brokerConfig, setBrokerConfig] = useState<BrokerConfig>(JSON.parse(JSON.stringify(DEFAULT_BROKER_CONFIG)));
  const [brokerAccount, setBrokerAccount] = useState<BrokerAccountSummary | null>(null);
  const [isResettingPaper, setIsResettingPaper] = useState(false);

  // 3. Notification Channels State
  const [notifConfig, setNotifConfig] = useState<NotificationChannelsConfig>(
    JSON.parse(JSON.stringify(DEFAULT_NOTIFICATION_CHANNELS_CONFIG))
  );
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [channelTestResults, setChannelTestResults] = useState<Record<string, ChannelTestResult>>({});

  // Android Native Foreground Service & WeChat Heads-Up Config
  const [bgDaemonConfig, setBgDaemonConfig] = useState<BackgroundDaemonConfig>(() =>
    backgroundAlertService.getConfig()
  );

  const handleToggleBgService = async (enabled: boolean) => {
    const updated = await backgroundAlertService.saveConfig({ enabled });
    setBgDaemonConfig(updated);
  };

  const handleUpdateBgInterval = async (intervalSeconds: number) => {
    const updated = await backgroundAlertService.saveConfig({ intervalSeconds });
    setBgDaemonConfig(updated);
  };

  // 4. System & Tray Preferences State
  const [closeActionPref, setCloseActionPref] = useState<'ASK' | 'MINIMIZE_TO_TRAY' | 'QUIT'>('ASK');

  // 5. Mobile & Network Relay State
  const [serverUrl, setServerUrl] = useState<string>(getServerBaseUrl());
  const [testingServer, setTestingServer] = useState<boolean>(false);
  const [serverTestStatus, setServerTestStatus] = useState<string | null>(null);

  // 6. Custom API probe ticker state
  const [customTestTicker, setCustomTestTicker] = useState<string>('NVDA');

  const handleSaveServerUrl = () => {
    setServerBaseUrl(serverUrl);
    wsClient.reconnect();
    setSaveMessage('电脑端桌面中继服务地址已保存并立即生效！');
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const handleTestServerConnection = async () => {
    setTestingServer(true);
    setServerTestStatus(null);
    try {
      const target = serverUrl.trim().replace(/\/+$/, '');
      if (!target) {
        setServerTestStatus('当前为公网独立直连模式（未配置电脑中继）');
        return;
      }
      const start = Date.now();
      const res = await fetch(`${target}/api/market/status`, { mode: 'cors' });
      const latency = Date.now() - start;
      if (res.ok) {
        setServerTestStatus(`🟢 电脑中继连接成功！延迟 ${latency}ms`);
      } else {
        setServerTestStatus(`🔴 响应异常 (HTTP ${res.status})`);
      }
    } catch (err: any) {
      setServerTestStatus(`🔴 无法连接电脑中继: ${err.message || '网络不可达'}`);
    } finally {
      setTestingServer(false);
    }
  };

  // Load configurations on mount
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [apiRes, brokerRes, accRes, notifRes] = await Promise.all([
          apiClient.getApiKeysConfig(),
          apiClient.getBrokerConfig(),
          apiClient.getBrokerAccount(),
          apiClient.getNotificationChannelsConfig()
        ]);
        if (isMounted) {
          if (apiRes.success && apiRes.config) setConfig(apiRes.config);
          if (brokerRes.success && brokerRes.config) setBrokerConfig(brokerRes.config);
          if (accRes.success && accRes.account) setBrokerAccount(accRes.account);
          if (notifRes.success && notifRes.config) setNotifConfig(notifRes.config);
        }
      } catch (err) {
        console.error('Failed to load settings config:', err);
      }
    }
    load();

    // Load local system close preference
    const remember = localStorage.getItem('v65_remember_close_action') === 'true';
    const pref = localStorage.getItem('v65_close_action_preference');
    if (remember && (pref === 'MINIMIZE_TO_TRAY' || pref === 'QUIT')) {
      setCloseActionPref(pref as 'MINIMIZE_TO_TRAY' | 'QUIT');
    } else {
      setCloseActionPref('ASK');
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // System & Tray Preference Handlers
  const handleSaveSystemPref = () => {
    setIsSaving(true);
    try {
      if (closeActionPref === 'ASK') {
        localStorage.removeItem('v65_remember_close_action');
        localStorage.removeItem('v65_close_action_preference');
      } else {
        localStorage.setItem('v65_remember_close_action', 'true');
        localStorage.setItem('v65_close_action_preference', closeActionPref);
      }
      setSaveMessage('系统托盘与窗口关闭偏好已成功保存并立即生效！');
      setTimeout(() => setSaveMessage(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCloseAction = () => {
    localStorage.removeItem('v65_remember_close_action');
    localStorage.removeItem('v65_close_action_preference');
    setCloseActionPref('ASK');
    setSaveMessage('已重置为每次关闭时弹窗询问！');
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const handleTestMinimizeToTray = () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.minimizeToTray) {
      electronAPI.minimizeToTray();
    } else if (electronAPI?.minimize) {
      electronAPI.minimize();
    }
  };

  // 4. Save API Configuration Handler
  const handleSaveApiConfig = async () => {
    setIsSaving(true);
    try {
      const res = await apiClient.updateApiKeysConfig(config);
      if (res.success) {
        setConfig(res.config);
        setSaveMessage('美股数据 API 配置已成功保存并立即生效！');
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err: any) {
      console.error('Failed to save config:', err);
      setSaveMessage(`保存配置失败: ${err.message || '网络异常'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Save Broker Configuration Handler
  const handleSaveBrokerConfig = async () => {
    setIsSaving(true);
    try {
      const res = await apiClient.updateBrokerConfig(brokerConfig);
      if (res.success) {
        setBrokerConfig(res.config);
        const accRes = await apiClient.getBrokerAccount();
        if (accRes.success) setBrokerAccount(accRes.account);
        setSaveMessage('券商实盘与纸盘交易路由配置已成功保存！');
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err: any) {
      console.error('Failed to save broker config:', err);
      setSaveMessage(`保存券商配置失败: ${err.message || '网络异常'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Reset Paper Account
  const handleResetPaperAccount = async () => {
    setIsResettingPaper(true);
    try {
      const res = await apiClient.resetPaperAccount(brokerConfig.paperBalance || 100000);
      if (res.success) {
        setBrokerAccount(res.account);
        setSaveMessage(`已成功重置模拟沙盒资金为 $${(brokerConfig.paperBalance || 100000).toLocaleString()}`);
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err: any) {
      console.error('Failed to reset paper account:', err);
    } finally {
      setIsResettingPaper(false);
    }
  };

  // 6.5 Save Notification Channels Configuration
  const handleSaveNotifConfig = async () => {
    setIsSaving(true);
    try {
      const res = await apiClient.updateNotificationChannelsConfig(notifConfig);
      if (res.success) {
        setNotifConfig(res.config);
        setSaveMessage('预警通知通道配置已成功保存并立即生效！');
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err: any) {
      console.error('Failed to save notification config:', err);
      setSaveMessage(`保存配置失败: ${err.message || '网络异常'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestChannel = async (channel: 'WEBHOOK' | 'TELEGRAM' | 'BARK') => {
    setTestingChannel(channel);
    try {
      const res = await apiClient.testNotificationChannel(channel, notifConfig);
      setChannelTestResults(prev => ({ ...prev, [channel]: res }));
    } catch (err: any) {
      setChannelTestResults(prev => ({
        ...prev,
        [channel]: { success: false, message: `测试发送异常: ${err.message}` }
      }));
    } finally {
      setTestingChannel(null);
    }
  };

  // 7. Reset to Factory Default Keys
  const handleResetDefaults = async () => {
    try {
      const res = await apiClient.resetApiKeysConfig();
      if (res.success) {
        setConfig(res.config);
        setSaveMessage('已成功恢复系统默认预置商业 API 密钥！');
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err: any) {
      console.error('Failed to reset config:', err);
    }
  };

  // 8. Test Single Provider
  const handleTestProvider = async (provider: 'finnhub' | 'massive' | 'alphaVantage') => {
    setTestingProvider(provider);
    try {
      const key =
        provider === 'finnhub'
          ? config.finnhubApiKey
          : provider === 'massive'
          ? config.massiveApiKey
          : config.alphaVantageApiKey;

      const res = await apiClient.testApiKey(provider, key, customTestTicker);
      if (res.success && res.result) {
        setConfig(prev => ({
          ...prev,
          providerStatus: {
            ...prev.providerStatus,
            [provider]: res.result
          }
        }));
      }
    } catch (err) {
      console.error(`Failed to test provider ${provider}:`, err);
    } finally {
      setTestingProvider(null);
    }
  };

  // 9. Test All Providers Concurrently
  const handleTestAll = async () => {
    setIsTestingAll(true);
    try {
      const res = await apiClient.testApiKey('ALL', undefined, customTestTicker);
      if (res.success && res.results) {
        setConfig(prev => ({
          ...prev,
          providerStatus: res.results,
          lastTestedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false })
        }));
        setSaveMessage(`全渠道 API 连通性测试已完成（探测标的: ${customTestTicker || '默认组合'}）！`);
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err) {
      console.error('Failed to test all providers:', err);
    } finally {
      setIsTestingAll(false);
    }
  };

  const getStatusBadge = (statusObj?: ApiProviderStatus) => {
    if (!statusObj || statusObj.status === 'UNTESTED') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>未测试</span>
        </span>
      );
    }
    if (statusObj.status === 'ONLINE') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>已连通 {statusObj.latencyMs ? `(${statusObj.latencyMs}ms)` : ''}</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        <span>异常/不可用</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-16 max-w-5xl mx-auto w-full">
      {/* 1. Header Command Deck */}
      <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                title="返回"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-800 text-white flex items-center justify-center shadow-xs shrink-0">
              <Settings className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {isMobile ? '系统设置 (Settings)' : '系统设置 (SETTINGS) · 商业量化底座配置'}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                  高可用架构
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                支持自定义数据接口密钥、多券商执行路由 (Alpaca/IBKR)、纸盘模拟沙盒及动态追踪止损风控。
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('DATA_API')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                activeTab === 'DATA_API'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isMobile ? '数据接口' : '数据接口 (API Keys)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BROKER_ROUTING')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                activeTab === 'BROKER_ROUTING'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isMobile ? '交易路由' : '券商与交易路由 (P2)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{isMobile ? '预警通道' : '预警通知通道 (Channels)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SYSTEM_PREF')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                activeTab === 'SYSTEM_PREF'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{isMobile ? '系统偏好' : '系统与托盘偏好 (System)'}</span>
            </button>
          </div>
        </div>

        {/* Save Feedback Banner */}
        {saveMessage && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. TAB 1: DATA API CONFIGURATION */}
      {activeTab === 'DATA_API' && (
        <div className="space-y-4">
          {/* Mobile & Network Relay Architecture Card */}
          <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-blue-50/70 rounded-2xl p-3.5 border border-indigo-100/80 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-indigo-100/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">
                      {isNativeMobile() ? '📱 Android 原生移动端独立运行' : isMobile ? '📱 移动端自适应运行' : '💻 桌面终端内建微服务运行'}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {serverUrl ? '中继模式 (Relay)' : '公网直连 (Direct)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {serverUrl
                      ? `已配置连接局域网 PC 终端 (${serverUrl})，共享深度量化回测与 WebSocket 高频价格流`
                      : '采用端到端公网直连架构，手机直接向 Finnhub、Polygon、Alpha Vantage 官方接口请求实时报价'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleTestServerConnection}
                  disabled={testingServer}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-indigo-700 text-[11px] font-bold border border-indigo-200 shadow-2xs transition-all cursor-pointer"
                >
                  {testingServer ? '中继测试中...' : '测试中继连接'}
                </button>
              </div>
            </div>

            {/* LAN Desktop Relay Configuration (Optional) */}
            <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[11px] font-bold text-slate-600 shrink-0">电脑端服务地址:</span>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={e => setServerUrl(e.target.value)}
                  placeholder="留空为公网直连；或填 http://192.168.1.100:3000"
                  className="flex-1 max-w-md bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-2.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleSaveServerUrl}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  保存地址
                </button>
              </div>
              {serverTestStatus && (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 truncate">
                  {serverTestStatus}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">美股多数据通道矩阵 (Finnhub / Massive / Alpha Vantage)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestAll}
                disabled={isTestingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer shadow-2xs"
              >
                {isTestingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>并发测试中...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>一键测试所有通道</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium border border-slate-200 transition-all cursor-pointer"
                title="一键恢复软件默认自带的商业 API 密钥"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>恢复默认密钥</span>
              </button>
            </div>
          </div>

          {/* 实时标的探测测试输入框 */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-800">公网真机连通性验证标的:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customTestTicker}
                  onChange={e => setCustomTestTicker(e.target.value.toUpperCase())}
                  placeholder="如 NVDA, TSLA, AAPL"
                  className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-black text-indigo-700 uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-1">
                  {['NVDA', 'TSLA', 'AAPL', 'MSFT'].map(sym => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setCustomTestTicker(sym)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        customTestTicker === sym
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-slate-400">
              输入任意美股代码后点击下方各通道「测试连通性」，直接请求公网返回其实时数据
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Finnhub */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative hover:border-blue-400 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                      FH
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">Finnhub Stock API</h3>
                      <span className="text-[10px] text-slate-400 block">实时报价 / 财报 / 新闻情绪</span>
                    </div>
                  </div>
                  {getStatusBadge(config.providerStatus?.finnhub)}
                </div>

                <div className="mt-3 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>API KEY 密钥:</span>
                    <span className="text-[10px] text-slate-400 font-normal">默认已预填可用</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showFinnhub ? 'text' : 'password'}
                      value={config.finnhubApiKey}
                      onChange={e => setConfig({ ...config, finnhubApiKey: e.target.value })}
                      placeholder="请输入 Finnhub API Key"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-2.5 py-1.5 pr-8 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFinnhub(!showFinnhub)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showFinnhub ? '隐藏' : '显示'}
                    >
                      {showFinnhub ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {config.providerStatus?.finnhub?.message && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                      响应: {config.providerStatus.finnhub.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">finnhub.io</span>
                <button
                  type="button"
                  onClick={() => handleTestProvider('finnhub')}
                  disabled={testingProvider === 'finnhub'}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition-all cursor-pointer"
                >
                  {testingProvider === 'finnhub' ? '连通性测试中...' : '测试连通性'}
                </button>
              </div>
            </div>

            {/* Massive */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative hover:border-emerald-400 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      MS
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">Massive API</h3>
                      <span className="text-[10px] text-slate-400 block">高并发实时 K 线 / 深度指标</span>
                    </div>
                  </div>
                  {getStatusBadge(config.providerStatus?.massive)}
                </div>

                <div className="mt-3 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>API KEY 密钥:</span>
                    <span className="text-[10px] text-slate-400 font-normal">默认已预填可用</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showMassive ? 'text' : 'password'}
                      value={config.massiveApiKey}
                      onChange={e => setConfig({ ...config, massiveApiKey: e.target.value })}
                      placeholder="请输入 Massive API Key"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-2.5 py-1.5 pr-8 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMassive(!showMassive)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showMassive ? '隐藏' : '显示'}
                    >
                      {showMassive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {config.providerStatus?.massive?.message && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                      响应: {config.providerStatus.massive.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">massive-api.com</span>
                <button
                  type="button"
                  onClick={() => handleTestProvider('massive')}
                  disabled={testingProvider === 'massive'}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-all cursor-pointer"
                >
                  {testingProvider === 'massive' ? '连通性测试中...' : '测试连通性'}
                </button>
              </div>
            </div>

            {/* Alpha Vantage */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 relative hover:border-purple-400 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                      AV
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">Alpha Vantage</h3>
                      <span className="text-[10px] text-slate-400 block">基础面 / 宏观数据 / 行业对标</span>
                    </div>
                  </div>
                  {getStatusBadge(config.providerStatus?.alphaVantage)}
                </div>

                <div className="mt-3 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>API KEY 密钥:</span>
                    <span className="text-[10px] text-slate-400 font-normal">默认已预填可用</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAlphaVantage ? 'text' : 'password'}
                      value={config.alphaVantageApiKey}
                      onChange={e => setConfig({ ...config, alphaVantageApiKey: e.target.value })}
                      placeholder="请输入 Alpha Vantage API Key"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl px-2.5 py-1.5 pr-8 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAlphaVantage(!showAlphaVantage)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showAlphaVantage ? '隐藏' : '显示'}
                    >
                      {showAlphaVantage ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {config.providerStatus?.alphaVantage?.message && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                      响应: {config.providerStatus.alphaVantage.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">alphavantage.co</span>
                <button
                  type="button"
                  onClick={() => handleTestProvider('alphaVantage')}
                  disabled={testingProvider === 'alphaVantage'}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold border border-purple-200 transition-all cursor-pointer"
                >
                  {testingProvider === 'alphaVantage' ? '连通性测试中...' : '测试连通性'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: BROKER ROUTING & PAPER SANDBOX CONFIGURATION (P2) */}
      {activeTab === 'BROKER_ROUTING' && (
        <div className="space-y-4">
          {/* Account Snapshot Bar */}
          {brokerAccount && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">当前活跃交易账户</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      {brokerAccount.provider === 'PAPER_SANDBOX' ? '量化纸盘沙盒 (内置)' : brokerAccount.provider}
                    </span>
                  </div>
                  <div className="text-xl font-extrabold font-mono text-white mt-0.5">
                    ${brokerAccount.portfolioValue.toLocaleString()} <span className="text-xs text-slate-400 font-normal">USD 资产净值</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs font-mono border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
                <div>
                  <span className="text-slate-400 block text-[10px]">可用现金</span>
                  <span className="font-bold text-white">${brokerAccount.cash.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">购买力 (2x)</span>
                  <span className="font-bold text-indigo-400">${brokerAccount.buyingPower.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">持仓标的数</span>
                  <span className="font-bold text-emerald-400">{brokerAccount.openPositionsCount} 只</span>
                </div>
              </div>
            </div>
          )}

          {/* Broker Route Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Option 1: Built-in Paper Sandbox */}
            <div
              onClick={() => setBrokerConfig({ ...brokerConfig, activeProvider: 'PAPER_SANDBOX' })}
              className={`rounded-2xl p-4 border cursor-pointer transition-all ${
                brokerConfig.activeProvider === 'PAPER_SANDBOX'
                  ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    SB
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900">纯本地量化沙盒 (推荐)</h3>
                    <span className="text-[10px] text-slate-400">零配置 · 毫秒级撮合 · 零泄露</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  brokerConfig.activeProvider === 'PAPER_SANDBOX' ? 'bg-amber-500 border-amber-600 text-white' : 'border-slate-300'
                }`}>
                  {brokerConfig.activeProvider === 'PAPER_SANDBOX' && <Check className="w-2.5 h-2.5" />}
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>虚拟本金设置:</span>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span>$</span>
                    <input
                      type="number"
                      value={brokerConfig.paperBalance}
                      onChange={e => setBrokerConfig({ ...brokerConfig, paperBalance: parseFloat(e.target.value) || 100000 })}
                      className="w-24 px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded font-bold text-right"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetPaperAccount}
                  disabled={isResettingPaper}
                  className="w-full mt-2 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重置沙盒至初始资金</span>
                </button>
              </div>
            </div>

            {/* Option 2: Alpaca Markets API */}
            <div
              onClick={() => setBrokerConfig({ ...brokerConfig, activeProvider: 'ALPACA' })}
              className={`rounded-2xl p-4 border cursor-pointer transition-all ${
                brokerConfig.activeProvider === 'ALPACA'
                  ? 'bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    AL
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900">Alpaca Markets</h3>
                    <span className="text-[10px] text-slate-400">美股主流免佣金量化券商</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  brokerConfig.activeProvider === 'ALPACA' ? 'bg-blue-500 border-blue-600 text-white' : 'border-slate-300'
                }`}>
                  {brokerConfig.activeProvider === 'ALPACA' && <Check className="w-2.5 h-2.5" />}
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-[11px] font-bold">API KEY ID:</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setBrokerConfig({ ...brokerConfig, alpacaMode: brokerConfig.alpacaMode === 'PAPER' ? 'LIVE' : 'PAPER' });
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold cursor-pointer hover:bg-slate-200"
                    >
                      {brokerConfig.alpacaMode} 模式
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  value={brokerConfig.alpacaKeyId}
                  onChange={e => setBrokerConfig({ ...brokerConfig, alpacaKeyId: e.target.value })}
                  placeholder="PK..."
                  onClick={e => e.stopPropagation()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600 text-[11px] font-bold">SECRET KEY:</span>
                </div>
                <div className="relative">
                  <input
                    type={showAlpacaSecret ? 'text' : 'password'}
                    value={brokerConfig.alpacaSecretKey}
                    onChange={e => setBrokerConfig({ ...brokerConfig, alpacaSecretKey: e.target.value })}
                    placeholder="Secret Key"
                    onClick={e => e.stopPropagation()}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 pr-6 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAlpacaSecret(!showAlpacaSecret);
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showAlpacaSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Option 3: Interactive Brokers */}
            <div
              onClick={() => setBrokerConfig({ ...brokerConfig, activeProvider: 'IBKR' })}
              className={`rounded-2xl p-4 border cursor-pointer transition-all ${
                brokerConfig.activeProvider === 'IBKR'
                  ? 'bg-rose-50/40 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                    IB
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900">盈透证券 (IBKR)</h3>
                    <span className="text-[10px] text-slate-400">TWS / Client Portal 本地网关</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  brokerConfig.activeProvider === 'IBKR' ? 'bg-rose-500 border-rose-600 text-white' : 'border-slate-300'
                }`}>
                  {brokerConfig.activeProvider === 'IBKR' && <Check className="w-2.5 h-2.5" />}
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>本地网关端口:</span>
                  <input
                    type="number"
                    value={brokerConfig.ibkrPort}
                    onChange={e => setBrokerConfig({ ...brokerConfig, ibkrPort: parseInt(e.target.value) || 5000 })}
                    onClick={e => e.stopPropagation()}
                    className="w-20 px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded font-mono font-bold text-right"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-2">
                  需在本地启动 IB Gateway 或 TWS 开启 API 端口 (默认 5000 / 7497)。
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Trailing Stop & Position Sizing Parameters Card */}
          <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-900">
                动态移动追踪止损 (Trailing Stop) 与资金风控偏好
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Default Position Size */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">默认单笔仓位占比</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={brokerConfig.defaultPositionSizePercent}
                    onChange={e => setBrokerConfig({ ...brokerConfig, defaultPositionSizePercent: parseFloat(e.target.value) || 5.0 })}
                    className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                  />
                  <span className="text-xs text-slate-500 font-bold">% 账户总值</span>
                </div>
                <span className="text-[10px] text-slate-400">单笔建议资金上限</span>
              </div>

              {/* Max Risk % */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">单笔硬风控损失上限</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={brokerConfig.maxRiskPerTradePercent}
                    onChange={e => setBrokerConfig({ ...brokerConfig, maxRiskPerTradePercent: parseFloat(e.target.value) || 1.0 })}
                    className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                  />
                  <span className="text-xs text-slate-500 font-bold">% 净值</span>
                </div>
                <span className="text-[10px] text-slate-400">触及止损最大亏损</span>
              </div>

              {/* Trailing Stop % */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">动态追踪回撤步长</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={brokerConfig.trailingStopPercent}
                    onChange={e => setBrokerConfig({ ...brokerConfig, trailingStopPercent: parseFloat(e.target.value) || 1.5 })}
                    className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                  />
                  <span className="text-xs text-slate-500 font-bold">% 峰值回撤</span>
                </div>
                <span className="text-[10px] text-slate-400">从历史最高点向上锁定浮盈</span>
              </div>

              {/* Break-even Step Trigger % */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">阶梯保本触发点</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="5"
                    value={brokerConfig.breakEvenStepTriggerPercent}
                    onChange={e => setBrokerConfig({ ...brokerConfig, breakEvenStepTriggerPercent: parseFloat(e.target.value) || 50 })}
                    className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                  />
                  <span className="text-xs text-slate-500 font-bold">% 目标止盈距</span>
                </div>
                <span className="text-[10px] text-slate-400">浮盈达 50% 自动上移止损至成本价</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3.5 TAB 3: NOTIFICATION CHANNELS (WEBHOOK / TELEGRAM / BARK) */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="space-y-4">
          {/* Notification Channels Header Card */}
          <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/60 to-purple-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3.5 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black text-slate-900 tracking-tight">预警通知通道外延 (Multi-Channel Dispatcher)</h2>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-bold">本地隐私保护</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                当盘中雷达扫描、TradingView 多维预警或暴跌反弹机会触发时，系统在播放纯本地 Web Audio 离线音效的同时，可通过以下通道将警报极速推送至您的外部终端或群聊。所有 Webhook 与 Bot Token 均在本地 SQLite 数据库中独立存储，绝对不上传至任何外部第三方服务器。
              </p>
            </div>
          </div>

          {/* Android 原生后台通讯与常驻守护 (WeChat 级顶端悬浮横幅弹窗) */}
          <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-emerald-50/80 rounded-2xl border border-blue-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 ${
                  bgDaemonConfig.enabled ? 'bg-[#1a73e8]' : 'bg-slate-400'
                }`}>
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900">Android 原生后台常驻守护与即时弹窗预警</h3>
                    <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full font-bold ${
                      bgDaemonConfig.enabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {bgDaemonConfig.enabled ? '常驻保活运行中' : '已暂停'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    采用 Android Foreground Service 前台保活与唤醒锁技术。切出微信、锁屏或黑屏仍保持扫描，触发时屏幕顶部直接弹出类似微信的悬浮横幅卡片与警报音。
                  </p>
                </div>
              </div>

              {/* 开关 */}
              <button
                type="button"
                onClick={() => handleToggleBgService(!bgDaemonConfig.enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  bgDaemonConfig.enabled ? 'bg-[#1a73e8]' : 'bg-slate-300'
                }`}
                title="开启/关闭后台保活常驻服务"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    bgDaemonConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {bgDaemonConfig.enabled && (
              <div className="pt-2.5 border-t border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                {/* 频率选择 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-700">后台扫描频率:</span>
                  {[
                    { label: '15秒 (极速)', sec: 15 },
                    { label: '30秒 (推荐)', sec: 30 },
                    { label: '1分钟', sec: 60 },
                    { label: '5分钟', sec: 300 }
                  ].map(item => (
                    <button
                      key={item.sec}
                      type="button"
                      onClick={() => handleUpdateBgInterval(item.sec)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        bgDaemonConfig.intervalSeconds === item.sec
                          ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* 电池白名单优化跳转 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => backgroundAlertService.requestBatteryOptimizationExemption()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 active:scale-95 transition cursor-pointer"
                    title="跳转至系统电池优化设置，开启允许后台高耗电无限制运行"
                  >
                    <BatteryCharging className="w-3.5 h-3.5 text-amber-500" />
                    <span>设置电池无限制运行 (白名单)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Channel 1: Webhook */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900">本地 / 远程 Webhook 通道</h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">HTTP POST</span>
                  </div>
                  <p className="text-[10px] text-slate-500">支持钉钉自定义机器人、企业微信群机器人、飞书 Webhook、Discord、Slack 或本地自动化监听服务</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-[11px] font-bold text-slate-600">{notifConfig.enableWebhook ? '已启用' : '已停用'}</span>
                <input
                  type="checkbox"
                  checked={notifConfig.enableWebhook}
                  onChange={e => setNotifConfig({ ...notifConfig, enableWebhook: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Webhook URL 目标推送地址</span>
                  <span className="text-[10px] text-slate-400 font-normal">需支持 HTTP/HTTPS POST</span>
                </label>
                <input
                  type="text"
                  value={notifConfig.webhookUrl}
                  onChange={e => setNotifConfig({ ...notifConfig, webhookUrl: e.target.value })}
                  placeholder="https://oapi.dingtalk.com/robot/send?access_token=... 或 自定义 URL"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Webhook Secret (可选安全签名 / 密钥)</span>
                  <span className="text-[10px] text-slate-400 font-normal">将自动附带在 X-Webhook-Secret 请求头中</span>
                </label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? 'text' : 'password'}
                    value={notifConfig.webhookSecret || ''}
                    onChange={e => setNotifConfig({ ...notifConfig, webhookSecret: e.target.value })}
                    placeholder="选填，如无需密钥可留空"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showWebhookSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Action & Result */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-mono">标准负载包含: ticker, conditionType, price, message, triggeredAt</span>
              <div className="flex items-center gap-2">
                {channelTestResults['WEBHOOK'] && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                    channelTestResults['WEBHOOK'].success
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {channelTestResults['WEBHOOK'].success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>{channelTestResults['WEBHOOK'].message}</span>
                    {channelTestResults['WEBHOOK'].latencyMs !== undefined && (
                      <span className="text-[10px] opacity-80">({channelTestResults['WEBHOOK'].latencyMs}ms)</span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleTestChannel('WEBHOOK')}
                  disabled={testingChannel === 'WEBHOOK' || !notifConfig.webhookUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  {testingChannel === 'WEBHOOK' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-emerald-600" />}
                  <span>测试 Webhook 发送</span>
                </button>
              </div>
            </div>
          </div>

          {/* Channel 2: Telegram Bot */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900">Telegram Bot 预警通道</h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold">Telegram API</span>
                  </div>
                  <p className="text-[10px] text-slate-500">通过 Telegram Bot 机器人将富文本 Markdown 格式预警推送到您的个人手机或 Telegram 频道</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-[11px] font-bold text-slate-600">{notifConfig.enableTelegram ? '已启用' : '已停用'}</span>
                <input
                  type="checkbox"
                  checked={notifConfig.enableTelegram}
                  onChange={e => setNotifConfig({ ...notifConfig, enableTelegram: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Telegram Bot Token</span>
                  <span className="text-[10px] text-slate-400 font-normal">来源于 @BotFather</span>
                </label>
                <div className="relative">
                  <input
                    type={showTgToken ? 'text' : 'password'}
                    value={notifConfig.telegramBotToken}
                    onChange={e => setNotifConfig({ ...notifConfig, telegramBotToken: e.target.value })}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTgToken(!showTgToken)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showTgToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Telegram Chat ID / 频道 ID</span>
                  <span className="text-[10px] text-slate-400 font-normal">可通过 @userinfobot 获取</span>
                </label>
                <input
                  type="text"
                  value={notifConfig.telegramChatId}
                  onChange={e => setNotifConfig({ ...notifConfig, telegramChatId: e.target.value })}
                  placeholder="-100123456789 或 个人 ID"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Test Action & Result */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-mono">消息包含: 触发标的、触发价格、周期、时间戳与量化研判</span>
              <div className="flex items-center gap-2">
                {channelTestResults['TELEGRAM'] && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                    channelTestResults['TELEGRAM'].success
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {channelTestResults['TELEGRAM'].success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>{channelTestResults['TELEGRAM'].message}</span>
                    {channelTestResults['TELEGRAM'].latencyMs !== undefined && (
                      <span className="text-[10px] opacity-80">({channelTestResults['TELEGRAM'].latencyMs}ms)</span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleTestChannel('TELEGRAM')}
                  disabled={testingChannel === 'TELEGRAM' || !notifConfig.telegramBotToken || !notifConfig.telegramChatId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  {testingChannel === 'TELEGRAM' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-sky-600" />}
                  <span>测试 Telegram 发送</span>
                </button>
              </div>
            </div>
          </div>

          {/* Channel 3: Bark */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900">Bark (iOS 极速强提醒)</h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">iOS APNs</span>
                  </div>
                  <p className="text-[10px] text-slate-500">通过苹果原生 APNs 推送至 iPhone / iPad，支持 Critical 强提醒级别与自定义震动，锁屏即看</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-[11px] font-bold text-slate-600">{notifConfig.enableBark ? '已启用' : '已停用'}</span>
                <input
                  type="checkbox"
                  checked={notifConfig.enableBark}
                  onChange={e => setNotifConfig({ ...notifConfig, enableBark: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Bark 服务器地址 (Server URL)</span>
                  <span className="text-[10px] text-slate-400 font-normal">留空默认使用官方服务</span>
                </label>
                <input
                  type="text"
                  value={notifConfig.barkServerUrl || ''}
                  onChange={e => setNotifConfig({ ...notifConfig, barkServerUrl: e.target.value })}
                  placeholder="https://api.day.app"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Bark 设备 Key (Device Key)</span>
                  <span className="text-[10px] text-slate-400 font-normal">从 iPhone Bark App 复制</span>
                </label>
                <div className="relative">
                  <input
                    type={showBarkKey ? 'text' : 'password'}
                    value={notifConfig.barkDeviceKey}
                    onChange={e => setNotifConfig({ ...notifConfig, barkDeviceKey: e.target.value })}
                    placeholder="例如: abCdEfGh123456"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBarkKey(!showBarkKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showBarkKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Action & Result */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-mono">配置后可在 iPhone 息屏状态下瞬间收到醒目预警推送</span>
              <div className="flex items-center gap-2">
                {channelTestResults['BARK'] && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                    channelTestResults['BARK'].success
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {channelTestResults['BARK'].success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>{channelTestResults['BARK'].message}</span>
                    {channelTestResults['BARK'].latencyMs !== undefined && (
                      <span className="text-[10px] opacity-80">({channelTestResults['BARK'].latencyMs}ms)</span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleTestChannel('BARK')}
                  disabled={testingChannel === 'BARK' || !notifConfig.barkDeviceKey}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  {testingChannel === 'BARK' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-purple-600" />}
                  <span>测试 Bark 发送</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 4: SYSTEM & TRAY PREFERENCES */}
      {activeTab === 'SYSTEM_PREF' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">系统生命周期与桌面托盘交互偏好 (System Lifecycle & Tray Policy)</span>
            <span className="text-[11px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
              商业桌面终端规范
            </span>
          </div>

          {/* 1. Close Behavior Preference Cards */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800">
                    关闭窗口默认行为 (Close Window Policy)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    设置点击窗口右上角“X”关闭按钮时的行为方式。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetCloseAction}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>恢复每次询问</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestMinimizeToTray}
                  className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition font-bold cursor-pointer"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span>立即测试最小化到托盘</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Option 1: ASK */}
              <div
                onClick={() => setCloseActionPref('ASK')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  closeActionPref === 'ASK'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        ?
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">每次询问确认</span>
                    </div>
                    {closeActionPref === 'ASK' ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    点击右上角“X”时弹出交互弹窗，可即时选择是最小化到托盘还是完全退出，并可勾选记住选择。
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-indigo-600 font-bold">
                  <span>推荐 · 防误触</span>
                  <span className="font-mono">DEFAULT</span>
                </div>
              </div>

              {/* Option 2: MINIMIZE_TO_TRAY */}
              <div
                onClick={() => setCloseActionPref('MINIMIZE_TO_TRAY')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  closeActionPref === 'MINIMIZE_TO_TRAY'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Minimize2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">最小化到系统托盘</span>
                    </div>
                    {closeActionPref === 'MINIMIZE_TO_TRAY' ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    点击右上角“X”直接隐藏主窗口并驻留 Windows 桌面右下角系统托盘，后台持续扫描并推送异动预警。
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-emerald-600 font-bold">
                  <span>后台静默监控</span>
                  <span className="font-mono">SILENT_TRAY</span>
                </div>
              </div>

              {/* Option 3: QUIT */}
              <div
                onClick={() => setCloseActionPref('QUIT')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  closeActionPref === 'QUIT'
                    ? 'border-rose-600 bg-rose-50/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <Power className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">直接退出程序</span>
                    </div>
                    {closeActionPref === 'QUIT' ? (
                      <CheckCircle2 className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    点击右上角“X”立即退出桌面程序并终止本地 Node.js 微服务与 WebSocket 连接，完全释放系统资源。
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-rose-600 font-bold">
                  <span>完全终止服务</span>
                  <span className="font-mono">FULL_EXIT</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. System Tray Interaction Matrix */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <MousePointer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-800">
                  Windows 桌面右下角系统托盘交互指南 (Tray Interaction Matrix)
                </h3>
                <p className="text-[11px] text-slate-400">
                  支持像富途牛牛、同花顺、TradingView 等商业专业终端一样的后台静默驻留与即时唤醒。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Item 1: Window Controls */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-slate-700">右上角窗口控制按钮规范</span>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-1.5 pl-3 list-disc">
                  <li>
                    <strong className="text-slate-800">最小化按钮「-」</strong>：直接进入 Windows 桌面右下角系统托盘，主窗口隐藏但后台进程与托盘常驻图标 100% 保留。
                  </li>
                  <li>
                    <strong className="text-slate-800">关闭按钮「X」</strong>：依上方偏好设置执行。若为「每次询问」，弹窗将提供「最小化到托盘」与「退出程序」双选卡片。
                  </li>
                  <li>
                    <strong className="text-slate-800">快捷键「Alt + F4」</strong>：被主窗口完全拦截，自动触发标准关闭确认逻辑，杜绝误触意外中断。
                  </li>
                </ul>
              </div>

              {/* Item 2: Tray Icon Mouse Actions */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-700">右下角常驻托盘图标鼠标操作</span>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-1.5 pl-3 list-disc">
                  <li>
                    <strong className="text-slate-800">鼠标左键单击 / 双击</strong>：快速唤醒量化终端主界面并自动置顶还原至桌面中央。
                  </li>
                  <li>
                    <strong className="text-slate-800">鼠标右键点击</strong>：弹出高密度原生上下文菜单，可直观查看预警引擎与 WebSocket 流运行状态、快捷跳转设置、或安全退出。
                  </li>
                  <li>
                    <strong className="text-slate-800">退出程序</strong>：通过托盘右键菜单选择「🚪 退出程序」，将彻底清除托盘常驻图标并安全停止所有本地微服务。
                  </li>
                </ul>
              </div>
            </div>

            {/* Background Performance Guarantee */}
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200/70 flex items-start gap-3">
              <Shield className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-indigo-900">
                  后台计算零降频保证 (backgroundThrottling: false)
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  标准浏览器核心在窗口最小化时会限制 JavaScript 定时器与网络通信频率。V6.5 终端已深度锁定后台高性能执行，即使主窗口隐藏在托盘中，多因子扫描、RSI 反转监测及 TradingView 级别 Universal Alert 仍以毫秒级客观时效持续运行。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Bottom Command Bar: Save and Confirm */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <Cpu className="w-4 h-4 text-slate-400" />
          <span>配置将直接保存在本地用户数据库 (Zero Cloud Upload · 本地隐私保护)</span>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              返回终端
            </button>
          )}

          <button
            type="button"
            onClick={
              activeTab === 'DATA_API'
                ? handleSaveApiConfig
                : activeTab === 'BROKER_ROUTING'
                ? handleSaveBrokerConfig
                : activeTab === 'NOTIFICATIONS'
                ? handleSaveNotifConfig
                : handleSaveSystemPref
            }
            disabled={isSaving}
            className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>保存配置并应用</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sticky Bottom Save Bar */}
      {isMobile && (
        <div
          className="fixed left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 shadow-lg flex items-center justify-between gap-2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}
        >
          <div className="text-[11px] font-bold text-slate-600 truncate pl-1">
            {activeTab === 'DATA_API'
              ? '行情接口配置'
              : activeTab === 'BROKER_ROUTING'
              ? '券商路由配置'
              : activeTab === 'NOTIFICATIONS'
              ? '预警通道配置'
              : '系统偏好设置'}
          </div>
          <button
            type="button"
            onClick={
              activeTab === 'DATA_API'
                ? handleSaveApiConfig
                : activeTab === 'BROKER_ROUTING'
                ? handleSaveBrokerConfig
                : activeTab === 'NOTIFICATIONS'
                ? handleSaveNotifConfig
                : handleSaveSystemPref
            }
            disabled={isSaving}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? '保存中...' : '保存配置并生效'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
