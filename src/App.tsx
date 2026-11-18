import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Moon, Power, Sun } from 'lucide-react';
import { LocationsPanel } from './components/LocationsPanel';
import { OverviewPanel } from './components/OverviewPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { SpeedTestPanel } from './components/SpeedTestPanel';
import { BillingReceipt, UpgradePanel } from './components/UpgradePanel';
import {
  computeRouteLatencyMs,
  DEFAULT_PREFERENCES,
  detectOriginFromTimezone,
  FREE_SERVER_IDS,
  VPN_SERVERS,
} from './data/vpnData';
import {
  BillingCycle,
  ConnectionStatus,
  NavSection,
  OriginNode,
  PlanTier,
  VpnPreferences,
  VpnServer,
} from './types/vpn';

const STORAGE_KEY = 'meridian_vpn_state_v1';

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavSection>('overview');

  const [preferences, setPreferences] = useState<VpnPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PREFERENCES, ...(parsed.preferences || {}) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PREFERENCES;
  });

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.favoriteIds)) return parsed.favoriteIds;
      }
    } catch {
      // ignore
    }
    return ['ch-zrh-01', 'sg-sin-03', 'ae-dxb-02'];
  });

  const [activePlan, setActivePlan] = useState<PlanTier>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activePlan === 'free' || parsed.activePlan === 'pro' || parsed.activePlan === 'max') {
          return parsed.activePlan;
        }
      }
    } catch {
      // ignore
    }
    return 'free';
  });

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [upgradePromptServer, setUpgradePromptServer] = useState<string | null>(null);
  const [verifiedReceipt, setVerifiedReceipt] = useState<BillingReceipt | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const [autoOrigin, setAutoOrigin] = useState<OriginNode>(() => detectOriginFromTimezone());
  const [manualOrigin, setManualOrigin] = useState<OriginNode | null>(null);
  const originNode = manualOrigin || autoOrigin;

  const localizedServers = useMemo(
    () =>
      VPN_SERVERS.map((srv) => ({
        ...srv,
        baseLatencyMs: computeRouteLatencyMs(originNode, srv),
      })),
    [originNode]
  );

  const [selectedServerId, setSelectedServerId] = useState<string>(VPN_SERVERS[0].id);
  const selectedServer = useMemo(
    () => localizedServers.find((s) => s.id === selectedServerId) || localizedServers[0],
    [localizedServers, selectedServerId]
  );

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [handshakeStep, setHandshakeStep] = useState<string>('Ready');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [detectedIp, setDetectedIp] = useState<string>('Detecting...');
  const [downloadMbps, setDownloadMbps] = useState(0);
  const [uploadMbps, setUploadMbps] = useState(0);

  const handshakeTimers = useRef<number[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
  }, [preferences.theme]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          preferences,
          favoriteIds,
          activePlan,
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [preferences, favoriteIds, activePlan]);

  useEffect(() => {
    let active = true;
    fetch('/api/network-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.detectedIp && data.detectedIp !== '127.0.0.1') {
          setDetectedIp(data.detectedIp);
        } else {
          setDetectedIp('Local Network');
        }
        if (
          data.geo &&
          typeof data.geo.lat === 'number' &&
          typeof data.geo.lon === 'number'
        ) {
          setAutoOrigin((prev) => ({
            city: data.geo.city || prev.city,
            country: data.geo.country || prev.country,
            code: data.geo.code || prev.code,
            lat: data.geo.lat,
            lon: data.geo.lon,
            ispIp: data.detectedIp || prev.ispIp,
          }));
        }
      })
      .catch(() => {
        if (active) setDetectedIp('Auto');
      });
    return () => {
      active = false;
    };
  }, []);

  // Handle return from Stripe Checkout (?checkout=success&session_id=... or ?checkout=canceled)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('checkout');
    const sessionId = params.get('session_id');

    if (!checkoutState) return;

    setActiveTab('upgrade');
    window.history.replaceState({}, document.title, window.location.pathname);

    if (checkoutState === 'canceled') {
      setCheckoutNotice('Stripe checkout was canceled. Your plan has not changed.');
      return;
    }

    if (checkoutState === 'success' && sessionId) {
      let active = true;
      fetch(`/api/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!active) return;
          if (data?.ok && data.paid) {
            const plan: PlanTier = data.planId === 'max' ? 'max' : 'pro';
            setActivePlan(plan);
            setVerifiedReceipt({
              planName: plan === 'max' ? 'Meridian Max' : 'Meridian Pro',
              transactionId: data.transactionId || sessionId,
              methodSummary: `Stripe (${data.email || 'Verified'})`,
              totalFormatted: data.amountFormatted || 'Paid',
            });
            setCheckoutNotice(null);
          } else {
            setCheckoutNotice(data?.error || 'Could not confirm Stripe payment session.');
          }
        })
        .catch(() => {
          if (active) setCheckoutNotice('Unable to verify payment session right now.');
        });

      return () => {
        active = false;
      };
    }
  }, []);

  const clearHandshakeTimers = useCallback(() => {
    handshakeTimers.current.forEach((id) => window.clearTimeout(id));
    handshakeTimers.current = [];
  }, []);

  const beginConnection = useCallback(
    (targetServer?: VpnServer) => {
      clearHandshakeTimers();
      const target = targetServer || selectedServer;
      setStatus('connecting');
      setHandshakeStep(`Connecting to ${target.city}...`);

      const t1 = window.setTimeout(() => {
        setHandshakeStep('Securing encrypted tunnel...');
      }, 450);

      const t2 = window.setTimeout(() => {
        setStatus('connected');
        setSessionSeconds(0);
        setHandshakeStep('Protected');
      }, 1050);

      handshakeTimers.current = [t1, t2];
    },
    [clearHandshakeTimers, selectedServer]
  );

  const handleToggleConnection = useCallback(() => {
    if (status === 'connected' || status === 'connecting') {
      clearHandshakeTimers();
      setStatus('disconnected');
      setSessionSeconds(0);
      setDownloadMbps(0);
      setUploadMbps(0);
      setHandshakeStep('Ready');
    } else {
      beginConnection();
    }
  }, [status, clearHandshakeTimers, beginConnection]);

  const handleRequestUpgrade = useCallback((server?: VpnServer) => {
    setUpgradePromptServer(server ? `${server.city}, ${server.country}` : null);
    setActiveTab('upgrade');
  }, []);

  const handleSelectServer = useCallback(
    (server: VpnServer) => {
      if (activePlan === 'free' && !FREE_SERVER_IDS.includes(server.id)) {
        handleRequestUpgrade(server);
        return;
      }
      setSelectedServerId(server.id);
      beginConnection(server);
    },
    [activePlan, beginConnection, handleRequestUpgrade]
  );

  const handleSelectOrigin = useCallback((choice: OriginNode | 'auto') => {
    setManualOrigin(choice === 'auto' ? null : choice);
  }, []);

  useEffect(() => {
    if (status !== 'connected') return;

    const timer = window.setInterval(() => {
      setSessionSeconds((s) => s + 1);
      const protocolBoost = preferences.protocol === 'wireguard' ? 1.15 : 0.85;
      const planBoost = activePlan === 'max' ? 2.2 : activePlan === 'pro' ? 1.55 : 0.85;
      setDownloadMbps(
        Number(
          ((42 + Math.sin(Date.now() / 1800) * 16 + Math.random() * 20) * protocolBoost * planBoost).toFixed(1)
        )
      );
      setUploadMbps(
        Number(
          ((14 + Math.cos(Date.now() / 2200) * 5 + Math.random() * 7) * protocolBoost * planBoost).toFixed(1)
        )
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status, preferences.protocol, activePlan]);

  const handleTogglePreference = useCallback(
    (key: 'killSwitch' | 'adTrackerShield') => {
      setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const handleUpdatePreference = useCallback(
    <K extends keyof VpnPreferences>(key: K, value: VpnPreferences[K]) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleToggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const navItems: Array<{ id: NavSection; label: string }> = useMemo(
    () => [
      { id: 'overview', label: 'Connect' },
      { id: 'locations', label: 'Locations' },
      { id: 'speed', label: 'Speed Test' },
      { id: 'upgrade', label: activePlan === 'free' ? 'Upgrade' : 'Plan' },
      { id: 'settings', label: 'Settings' },
    ],
    [activePlan]
  );

  const durationFormatted = formatDuration(sessionSeconds);

  return (
    <div className="min-h-screen w-full overflow-x-clip flex flex-col bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100">
      {/* Clean 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-[#0A101D]/90 backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 whitespace-nowrap cursor-pointer"
          >
            <svg viewBox="0 0 28 28" className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" aria-hidden="true">
              <path
                d="M14 2L24 6.5V13.8C24 19.6 19.8 24.4 14 26C8.2 24.4 4 19.6 4 13.8V6.5L14 2Z"
                className="fill-emerald-600/15 stroke-emerald-500"
                strokeWidth="1.6"
              />
              <path
                d="M14 7.5L17.2 14L14 20.5L10.8 14L14 7.5Z"
                className="fill-emerald-500"
              />
              <circle cx="14" cy="14" r="1.4" className="fill-white dark:fill-slate-950" />
            </svg>
            <span className="font-display text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              Meridian VPN
            </span>
          </button>

          {/* Zone 2: Primary Text Navigation */}
          <nav
            className="hidden md:flex items-center gap-3.5 lg:gap-6 shrink-0"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-5 text-xs lg:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Day/Dark Switch + Primary Connect Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleUpdatePreference('theme', 'light')}
                aria-label="Day light mode"
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  preferences.theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Day</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdatePreference('theme', 'dark')}
                aria-label="Dark night mode"
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  preferences.theme === 'dark'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dark</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleConnection}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                status === 'connected'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700'
                  : status === 'connecting'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              <Power className="w-3.5 h-3.5 shrink-0" />
              {status === 'connected' ? (
                <span>Disconnect</span>
              ) : status === 'connecting' ? (
                <span>Connecting...</span>
              ) : (
                <>
                  <span className="sm:hidden">Connect</span>
                  <span className="hidden sm:inline">Quick Connect</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Compact Nav Row */}
        <nav
          className="md:hidden flex items-center justify-around border-t border-slate-200 dark:border-slate-800/80 px-1"
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative py-2.5 px-2 text-[11px] sm:text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.id === 'speed' ? 'Speed' : item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Spacious Full-Width Viewport */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 max-w-[1360px] w-full mx-auto">
        {activeTab === 'overview' && (
          <OverviewPanel
            originNode={originNode}
            isAutoOrigin={manualOrigin === null}
            servers={localizedServers}
            selectedServer={selectedServer}
            status={status}
            activePlan={activePlan}
            handshakeStep={handshakeStep}
            durationFormatted={durationFormatted}
            detectedIp={detectedIp}
            preferences={preferences}
            downloadMbps={downloadMbps}
            uploadMbps={uploadMbps}
            onSelectServer={handleSelectServer}
            onSelectOrigin={handleSelectOrigin}
            onToggleConnection={handleToggleConnection}
            onTogglePreference={handleTogglePreference}
            onOpenLocations={() => setActiveTab('locations')}
            onOpenUpgrade={() => handleRequestUpgrade()}
          />
        )}

        {activeTab === 'locations' && (
          <LocationsPanel
            servers={localizedServers}
            selectedServer={selectedServer}
            status={status}
            activePlan={activePlan}
            favoriteIds={favoriteIds}
            onSelectServer={(srv) => {
              handleSelectServer(srv);
              setActiveTab('overview');
            }}
            onToggleFavorite={handleToggleFavorite}
            onRequestUpgrade={(srv) => handleRequestUpgrade(srv)}
          />
        )}

        {activeTab === 'speed' && (
          <SpeedTestPanel status={status} selectedServer={selectedServer} />
        )}

        {activeTab === 'upgrade' && (
          <UpgradePanel
            activePlan={activePlan}
            billingCycle={billingCycle}
            promptServerName={upgradePromptServer}
            verifiedReceipt={verifiedReceipt}
            checkoutNotice={checkoutNotice}
            onChangeBillingCycle={setBillingCycle}
            onActivatePlan={(plan) => {
              setActivePlan(plan);
              if (plan === 'free' && !FREE_SERVER_IDS.includes(selectedServerId)) {
                setSelectedServerId(FREE_SERVER_IDS[0]);
              }
            }}
            onClearPrompt={() => setUpgradePromptServer(null)}
            onDismissReceipt={() => setVerifiedReceipt(null)}
            onDismissNotice={() => setCheckoutNotice(null)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            preferences={preferences}
            activePlan={activePlan}
            onUpdatePreference={handleUpdatePreference}
            onOpenUpgrade={() => handleRequestUpgrade()}
          />
        )}
      </main>
    </div>
  );
}
