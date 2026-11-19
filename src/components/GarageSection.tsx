import React, { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { LIVERIES, UPGRADE_DEFS, getUpgradeCost } from '../data/campaign';
import { GarageEngine } from '../engine/GarageEngine';
import { HERO_FALLBACK_IMAGE } from '../data/campaign';
import { LiveryId, PlayerProgression, UpgradeKey } from '../types/game';

interface GarageSectionProps {
  progression: PlayerProgression;
  onPurchaseUpgrade: (key: UpgradeKey) => boolean;
  onSelectOrBuyLivery: (id: LiveryId) => boolean;
}

export const GarageSection: React.FC<GarageSectionProps> = ({
  progression,
  onPurchaseUpgrade,
  onSelectOrBuyLivery,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GarageEngine | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [activePreset, setActivePreset] = useState<'three-quarter' | 'profile' | 'front'>(
    'three-quarter'
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let engine: GarageEngine | null = null;
    try {
      engine = new GarageEngine(
        container,
        progression.activeLivery,
        progression.upgrades
      );
      engineRef.current = engine;

      const canvas = container.querySelector('canvas');
      const handleLost = (e: Event) => {
        e.preventDefault();
        setWebglError(true);
      };
      const handleRestored = () => setWebglError(false);
      canvas?.addEventListener('webglcontextlost', handleLost);
      canvas?.addEventListener('webglcontextrestored', handleRestored);

      return () => {
        canvas?.removeEventListener('webglcontextlost', handleLost);
        canvas?.removeEventListener('webglcontextrestored', handleRestored);
        engine?.dispose();
        engineRef.current = null;
      };
    } catch {
      setWebglError(true);
    }
    // Mount once; customization updates flow through dedicated effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setCustomization(
      progression.activeLivery,
      progression.upgrades
    );
  }, [progression.activeLivery, progression.upgrades]);

  const handlePreset = (preset: 'three-quarter' | 'profile' | 'front') => {
    setActivePreset(preset);
    engineRef.current?.setCameraPreset(preset);
  };

  return (
    <section id="garage" className="mx-auto max-w-[1360px] px-6 py-20 border-b border-white/10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-sm font-medium text-[#E85D04] mb-2">
            02. Interactive 3D Workshop
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5EFEA] text-balance">
            Tune Performance &amp; Desert Livery
          </h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[#C2B0A2]">Available Balance</span>
          <span className="font-mono-telemetry text-xl font-semibold text-[#F59E0B]">
            {progression.credits.toLocaleString()} CR
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Live 3D Inspectable Bike Turntable */}
        <div className="lg:col-span-7 relative min-h-[420px] lg:min-h-[540px] rounded-lg border border-white/10 bg-[#17120F] overflow-hidden">
          {!webglError ? (
            <div ref={mountRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />
          ) : (
            <img
              src={HERO_FALLBACK_IMAGE}
              alt="Motocross bike showcase fallback"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
          )}

          {/* Top-left quiet hint */}
          <div className="pointer-events-none absolute top-4 left-4 z-10 text-xs text-[#C2B0A2]">
            Drag to orbit 360° · Scroll to zoom
          </div>

          {/* Bottom-center compact camera preset dock (no backdrop-filter over WebGL) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-md border border-white/15 bg-[#110E0C]/90 p-1">
            <button
              type="button"
              onClick={() => handlePreset('three-quarter')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePreset === 'three-quarter'
                  ? 'bg-[#E85D04] text-white'
                  : 'text-[#C2B0A2] hover:text-white'
              }`}
            >
              3/4 View
            </button>
            <button
              type="button"
              onClick={() => handlePreset('profile')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePreset === 'profile'
                  ? 'bg-[#E85D04] text-white'
                  : 'text-[#C2B0A2] hover:text-white'
              }`}
            >
              Side Profile
            </button>
            <button
              type="button"
              onClick={() => handlePreset('front')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePreset === 'front'
                  ? 'bg-[#E85D04] text-white'
                  : 'text-[#C2B0A2] hover:text-white'
              }`}
            >
              Front Forks
            </button>
            <button
              type="button"
              onClick={() => handlePreset('three-quarter')}
              aria-label="Reset camera view"
              className="p-1.5 text-[#C2B0A2] hover:text-white rounded cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Liveries & Mechanical Upgrades */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          {/* Livery Finishes */}
          <div className="rounded-lg border border-white/10 bg-[#1B1512] p-5">
            <h3 className="text-sm font-semibold text-[#F5EFEA] mb-3">
              Factory Plastic &amp; Tank Livery
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {LIVERIES.map((livery) => {
                const owned = progression.ownedLiveries.includes(livery.id);
                const active = progression.activeLivery === livery.id;
                const canAfford = progression.credits >= livery.cost;

                return (
                  <button
                    key={livery.id}
                    type="button"
                    disabled={!owned && !canAfford}
                    onClick={() => onSelectOrBuyLivery(livery.id)}
                    className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left transition-colors duration-150 ${
                      active
                        ? 'border-[#E85D04] bg-[#241C17]'
                        : owned || canAfford
                        ? 'border-white/10 bg-[#16110E] hover:border-white/25 cursor-pointer'
                        : 'border-white/5 bg-[#16110E] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-4 w-4 rounded-sm shrink-0 border border-white/20"
                        style={{ backgroundColor: livery.primaryHex }}
                      />
                      <span className="text-xs font-medium text-[#F5EFEA] truncate">
                        {livery.name}
                      </span>
                    </div>
                    <span className="font-mono-telemetry text-[11px] text-[#C2B0A2] shrink-0">
                      {active ? (
                        <Check className="w-3.5 h-3.5 text-[#F59E0B]" />
                      ) : owned ? (
                        'Owned'
                      ) : (
                        `${livery.cost} CR`
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Performance Upgrades */}
          <div className="rounded-lg border border-white/10 bg-[#1B1512] p-5 flex-1 flex flex-col justify-between gap-4">
            <h3 className="text-sm font-semibold text-[#F5EFEA]">
              Mechanical Upgrades
            </h3>
            <div className="space-y-4">
              {UPGRADE_DEFS.map((def) => {
                const level = progression.upgrades[def.key];
                const isMax = level >= def.maxLevel;
                const cost = getUpgradeCost(def.key, level);
                const canAfford = progression.credits >= cost;

                return (
                  <div
                    key={def.key}
                    className="pb-4 border-b border-white/10 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#F5EFEA]">
                          <span>{def.label}</span>
                          <span aria-hidden="true" className="text-[#C2B0A2]">·</span>
                          <span className="font-mono-telemetry text-xs text-[#F59E0B]">
                            Tier {level}/{def.maxLevel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#C2B0A2] leading-relaxed">
                          {def.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isMax || !canAfford}
                        onClick={() => onPurchaseUpgrade(def.key)}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 ${
                          isMax
                            ? 'bg-[#241C17] text-[#F59E0B] cursor-default'
                            : canAfford
                            ? 'bg-[#E85D04] text-white hover:bg-[#D14E00] cursor-pointer'
                            : 'bg-[#241C17] text-[#C2B0A2]/45 cursor-not-allowed'
                        }`}
                      >
                        {isMax ? 'Maxed' : `Upgrade · ${cost} CR`}
                      </button>
                    </div>

                    {/* Tier bar */}
                    <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((tier) => (
                        <div
                          key={tier}
                          className={`h-1.5 rounded-xs ${
                            tier <= level ? 'bg-[#E85D04]' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
