import React from 'react';
import { Check, Crown, Moon, Sun } from 'lucide-react';
import { PROTOCOL_OPTIONS, SUBSCRIPTION_PLANS } from '../data/vpnData';
import { PlanTier, VpnPreferences, VpnProtocolId } from '../types/vpn';

interface SettingsPanelProps {
  preferences: VpnPreferences;
  activePlan: PlanTier;
  onUpdatePreference: <K extends keyof VpnPreferences>(key: K, value: VpnPreferences[K]) => void;
  onOpenUpgrade: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  preferences,
  activePlan,
  onUpdatePreference,
  onOpenUpgrade,
}) => {
  const simpleProtocols = PROTOCOL_OPTIONS.slice(0, 2); // WireGuard & OpenVPN UDP
  const planMeta = SUBSCRIPTION_PLANS.find((p) => p.id === activePlan) || SUBSCRIPTION_PLANS[0];

  return (
    <div className="w-full min-w-0 max-w-3xl mx-auto space-y-6">
      {/* VPN Protocol */}
      <div className="border border-slate-200 dark:border-slate-800/90 rounded-xl bg-white dark:bg-[#0F1725] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/90">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            VPN Protocol
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800/90">
          {simpleProtocols.map((proto) => {
            const isSelected = preferences.protocol === proto.id;
            return (
              <button
                key={proto.id}
                type="button"
                onClick={() => onUpdatePreference('protocol', proto.id as VpnProtocolId)}
                className={`text-left p-5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/35'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {proto.name}
                  </span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {proto.summary}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Essential Protection Toggles */}
      <div className="border border-slate-200 dark:border-slate-800/90 rounded-xl bg-white dark:bg-[#0F1725] divide-y divide-slate-100 dark:divide-slate-800/70">
        {[
          {
            key: 'killSwitch' as const,
            title: 'Internet Kill Switch',
            subtitle: 'Block internet access automatically if the VPN tunnel drops',
          },
          {
            key: 'adTrackerShield' as const,
            title: 'Ad & Tracker Blocker',
            subtitle: 'Block intrusive ads and tracking domains automatically',
          },
          {
            key: 'autoConnectUntrusted' as const,
            title: 'Auto-Connect on Public Wi-Fi',
            subtitle: 'Protect your connection when joining unknown networks',
          },
        ].map((item) => (
          <div key={item.key} className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {item.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {item.subtitle}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences[item.key]}
              aria-label={item.title}
              onClick={() => onUpdatePreference(item.key, !preferences[item.key])}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                preferences[item.key] ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  preferences[item.key] ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Appearance Theme */}
      <div className="border border-slate-200 dark:border-slate-800/90 rounded-xl bg-white dark:bg-[#0F1725] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Appearance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Switch between dark obsidian and light daylight mode
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onUpdatePreference('theme', 'dark')}
            className={`inline-flex items-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              preferences.theme === 'dark'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
          <button
            type="button"
            onClick={() => onUpdatePreference('theme', 'light')}
            className={`inline-flex items-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              preferences.theme === 'light'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
        </div>
      </div>

      {/* Subscription Plan */}
      <div className="border border-slate-200 dark:border-slate-800/90 rounded-xl bg-white dark:bg-[#0F1725] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Crown className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {planMeta.name} Plan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {planMeta.serverAccessLabel} · Up to {planMeta.deviceLimit} device
              {planMeta.deviceLimit > 1 ? 's' : ''} · {planMeta.bandwidthLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenUpgrade}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {activePlan === 'free' ? 'Upgrade Plan' : 'Manage Plan'}
        </button>
      </div>
    </div>
  );
};
