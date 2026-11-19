import React, { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { CAMPAIGN_STAGES, HERO_FALLBACK_IMAGE } from '../data/campaign';
import { PlayerProgression } from '../types/game';

interface HeroSectionProps {
  progression: PlayerProgression;
  onLaunchRide: (stageId?: string) => void;
  onScrollToCampaign: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  progression,
  onLaunchRide,
  onScrollToCampaign,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const selectedStage =
    CAMPAIGN_STAGES.find((s) => s.id === progression.selectedStageId) ??
    CAMPAIGN_STAGES[0];

  const completedCount = Object.values(progression.records).filter(
    (r) => r.completions > 0
  ).length;
  const topSpeed = Math.max(
    0,
    ...Object.values(progression.records).map((r) => r.topSpeedKmh)
  );
  const longestAir = Math.max(
    0,
    ...Object.values(progression.records).map((r) => r.maxAirtimeSec)
  );

  return (
    <section id="hero" className="relative border-b border-white/10">
      <div className="relative min-h-[560px] lg:min-h-[650px] flex items-end overflow-hidden bg-gradient-to-br from-[#2B150E] via-[#1A120E] to-[#110E0C]">
        {!imgFailed && (
          <img
            src={HERO_FALLBACK_IMAGE}
            alt="Motocross rider carving a sunset desert canyon trail kicking up burnt-orange dust"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
          />
        )}

        {/* Measured multi-stop sunset scrim for 4.5:1 text contrast */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#110E0C] via-[#110E0C]/65 to-[#110E0C]/25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#110E0C]/90 via-[#110E0C]/45 to-transparent"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1360px] px-6 py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[#F59E0B] tracking-wide mb-3">
              Sunset Canyon Motocross · 3-Stage 3D Campaign
            </p>
            <h1 className="font-display text-[clamp(2.75rem,5vw,4.5rem)] font-bold leading-[0.98] tracking-tight text-[#F5EFEA] text-balance">
              Carve Redrock Berms. Launch the Canyon Sky.
            </h1>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#D8C9BE] max-w-xl">
              Throttle a 450cc desert dirt bike through three sculpted sandstone trails.
              Nail tabletop kickers, link mid-air whips and backflips, and tune your
              suspension in the 3D workshop.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onLaunchRide(selectedStage.id)}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#E85D04] rounded-md transition-colors duration-150 hover:bg-[#D14E00] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
              >
                <span>Ride {selectedStage.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onScrollToCampaign}
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-[#F5EFEA] border border-white/20 bg-[#1B1512]/80 rounded-md transition-colors duration-150 hover:border-[#E85D04] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore Stages</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width 4-column unboxed rider telemetry strip */}
      <div className="bg-[#16110E] border-t border-white/10">
        <div className="mx-auto max-w-[1360px] px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div>
            <p className="text-xs font-medium text-[#C2B0A2]">Race Credits</p>
            <p className="mt-1 font-mono-telemetry text-2xl font-semibold text-[#F59E0B]">
              {progression.credits.toLocaleString()} CR
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#C2B0A2]">Campaign Stages Cleared</p>
            <p className="mt-1 font-mono-telemetry text-2xl font-semibold text-[#F5EFEA]">
              {completedCount} / {CAMPAIGN_STAGES.length}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#C2B0A2]">Recorded Top Speed</p>
            <p className="mt-1 font-mono-telemetry text-2xl font-semibold text-[#F5EFEA]">
              {topSpeed > 0 ? `${topSpeed} km/h` : '— km/h'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#C2B0A2]">Longest Canyon Air</p>
            <p className="mt-1 font-mono-telemetry text-2xl font-semibold text-[#F5EFEA]">
              {longestAir > 0 ? `${longestAir.toFixed(2)} s` : '— s'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
