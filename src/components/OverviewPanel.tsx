import React from 'react';
import { ArrowRight, Lock, Shield } from 'lucide-react';
import { FREE_SERVER_IDS } from '../data/vpnData';
import { ConnectionStatus, OriginNode, PlanTier, VpnPreferences, VpnServer } from '../types/vpn';
import { ConnectionOrb } from './ConnectionOrb';
import { CountryFlag } from './CountryFlag';
import { WorldRouteMap } from './WorldRouteMap';

interface OverviewPanelProps {
  originNode: OriginNode;
  isAutoOrigin: boolean;
  servers: VpnServer[];
  selectedServer: VpnServer;
  status: ConnectionStatus;
  activePlan: PlanTier;
  handshakeStep: string;
  durationFormatted: string;
  detectedIp: string;
  preferences: VpnPreferences;
  downloadMbps: number;
  uploadMbps: number;
  onSelectServer: (server: VpnServer) => void;
  onSelectOrigin: (origin: OriginNode | 'auto') => void;
  onToggleConnection: () => void;
  onTogglePreference: (key: 'killSwitch' | 'adTrackerShield') => void;
  onOpenLocations: () => void;
  onOpenUpgrade: () => void;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  originNode,
  isAutoOrigin,
  servers,
  selectedServer,
  status,
  activePlan,
  handshakeStep,
  durationFormatted,
  detectedIp,
  preferences,
  downloadMbps,
  uploadMbps,
  onSelectServer,
  onSelectOrigin,
  onToggleConnection,
  onTogglePreference,
  onOpenLocations,
  onOpenUpgrade,
}) => {
  const recommendedServers = [...servers]
    .sort((a, b) => a.baseLatencyMs - b.baseLatencyMs)
    .slice(0, 4);

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* Flagship 2-Column Stage: Power Core Dial (Left) + Immersive 3D Globe (Right) */}
      <div className="w-full min-w-0 grid grid-cols-1 lg:grid-cols-12 border border-slate-200 dark:border-slate-800/90 rounded-2xl overflow-hidden bg-white dark:bg-[#0D1524] shadow-sm">
        <div className="min-w-0 lg:col-span-4 flex flex-col divide-y divide-slate-200 dark:divide-slate-800/90 lg:border-r border-slate-200 dark:border-slate-800/90">
          <div className="flex-1">
            <ConnectionOrb
              status={status}
              handshakeStep={handshakeStep}
              selectedServer={selectedServer}
              protocol={preferences.protocol}
              activePlan={activePlan}
              durationFormatted={durationFormatted}
              detectedIp={detectedIp}
              downloadMbps={downloadMbps}
              uploadMbps={uploadMbps}
              onToggleConnection={onToggleConnection}
              onOpenUpgrade={onOpenUpgrade}
            />
          </div>

          <div className="p-5 space-y-3 bg-slate-50/70 dark:bg-[#09101C]">
            {[
              {
                key: 'killSwitch' as const,
                label: 'Kill Switch',
                detail: 'Block traffic if VPN drops',
                icon: Lock,
                active: preferences.killSwitch,
              },
              {
                key: 'adTrackerShield' as const,
                label: 'Ad & Tracker Blocker',
                detail: 'Filter ads and trackers',
                icon: Shield,
                active: preferences.adTrackerShield,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.detail}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.active}
                    aria-label={item.label}
                    onClick={() => onTogglePreference(item.key)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                      item.active ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        item.active ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 lg:col-span-8 flex flex-col">
          <WorldRouteMap
            originNode={originNode}
            isAutoOrigin={isAutoOrigin}
            servers={servers}
            selectedServer={selectedServer}
            status={status}
            onSelectServer={onSelectServer}
            onSelectOrigin={onSelectOrigin}
          />
        </div>
      </div>

      {/* Fast Locations Strip */}
      <div className="w-full min-w-0 border border-slate-200 dark:border-slate-800/90 rounded-2xl bg-white dark:bg-[#0D1524] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Fast Locations
          </h3>
          <button
            type="button"
            onClick={onOpenLocations}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            All {servers.length} Locations
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800/90">
          {recommendedServers.map((server) => {
            const isSelected = server.id === selectedServer.id;
            const isLocked = activePlan === 'free' && !FREE_SERVER_IDS.includes(server.id);
            return (
              <button
                key={server.id}
                type="button"
                onClick={() => onSelectServer(server)}
                className={`text-left p-4 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/25'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CountryFlag code={server.code} className="w-6 h-4" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {server.city}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    {server.baseLatencyMs} ms
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
                  <span>{server.country}</span>
                  {isLocked ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                      <Lock className="w-3 h-3" />
                      Pro
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                      {isSelected ? (status === 'connected' ? 'Connected' : 'Selected') : ''}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
