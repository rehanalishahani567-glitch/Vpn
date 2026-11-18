import React, { useMemo, useState } from 'react';
import { Check, Lock, Search, Star } from 'lucide-react';
import { FREE_SERVER_IDS } from '../data/vpnData';
import { ConnectionStatus, PlanTier, ServerRegion, VpnServer } from '../types/vpn';
import { CountryFlag } from './CountryFlag';

interface LocationsPanelProps {
  servers: VpnServer[];
  selectedServer: VpnServer;
  status: ConnectionStatus;
  activePlan: PlanTier;
  favoriteIds: string[];
  onSelectServer: (server: VpnServer) => void;
  onToggleFavorite: (id: string) => void;
  onRequestUpgrade: (server: VpnServer) => void;
}

const SignalBars: React.FC<{ latencyMs: number }> = ({ latencyMs }) => {
  const bars = latencyMs < 70 ? 4 : latencyMs < 130 ? 3 : latencyMs < 180 ? 2 : 1;
  const activeColor =
    bars >= 3 ? 'bg-emerald-500' : bars === 2 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="inline-flex items-end gap-0.5 h-3.5 shrink-0" aria-hidden="true">
      {[1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className={`w-1 rounded-xs ${
            level <= bars ? activeColor : 'bg-slate-200 dark:bg-slate-700'
          }`}
          style={{ height: `${level * 3 + 2}px` }}
        />
      ))}
    </div>
  );
};

export const LocationsPanel: React.FC<LocationsPanelProps> = ({
  servers,
  selectedServer,
  status,
  activePlan,
  favoriteIds,
  onSelectServer,
  onToggleFavorite,
  onRequestUpgrade,
}) => {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'All' | 'Favorites' | ServerRegion>('All');

  const filteredServers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return servers
      .filter((s) => {
        if (regionFilter === 'Favorites' && !favoriteIds.includes(s.id)) return false;
        if (
          regionFilter !== 'All' &&
          regionFilter !== 'Favorites' &&
          s.region !== regionFilter
        ) {
          return false;
        }
        if (q) {
          return (
            s.city.toLowerCase().includes(q) ||
            s.country.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.baseLatencyMs - b.baseLatencyMs);
  }, [servers, search, regionFilter, favoriteIds]);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Search & Region Filter */}
      <div className="w-full min-w-0 border border-slate-200 dark:border-slate-800/90 rounded-xl bg-white dark:bg-[#0F1725] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Select Server Location
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city or country..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/70">
          {(['All', 'Favorites', 'Europe', 'Asia Pacific', 'Americas', 'Middle East'] as const).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRegionFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  regionFilter === tab
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-slate-50 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      {/* Country Cards Grid */}
      {filteredServers.length === 0 ? (
        <div className="w-full border border-slate-200 dark:border-slate-800/90 rounded-xl bg-white dark:bg-[#0F1725] py-14 px-6 text-center">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            No locations match your search
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setRegionFilter('All');
            }}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 cursor-pointer"
          >
            Show All Locations
          </button>
        </div>
      ) : (
        <div className="w-full min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredServers.map((server) => {
            const isSelected = server.id === selectedServer.id;
            const isFav = favoriteIds.includes(server.id);
            const isLocked = activePlan === 'free' && !FREE_SERVER_IDS.includes(server.id);

            return (
              <div
                key={server.id}
                className={`min-w-0 border rounded-xl p-4 flex flex-col justify-between transition-colors ${
                  isSelected
                    ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0F1725] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <CountryFlag code={server.code} className="w-8 h-5" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {server.city}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {server.country}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleFavorite(server.id)}
                    aria-label={isFav ? `Unpin ${server.city}` : `Pin ${server.city}`}
                    className="text-slate-400 hover:text-amber-500 transition-colors cursor-pointer p-1 shrink-0"
                  >
                    <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                    <SignalBars latencyMs={server.baseLatencyMs} />
                    {server.baseLatencyMs} ms
                  </span>

                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => onRequestUpgrade(server)}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Lock className="w-3 h-3" />
                      Pro
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectServer(server)}
                      className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 hover:bg-sky-600 hover:text-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {isSelected
                        ? status === 'connected'
                          ? 'Connected'
                          : 'Selected'
                        : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
