import React, { useState } from 'react';
import { Lock, Play } from 'lucide-react';
import { CAMPAIGN_STAGES } from '../data/campaign';
import { PlayerProgression } from '../types/game';

interface CampaignSectionProps {
  progression: PlayerProgression;
  onSelectAndLaunch: (stageId: string) => void;
}

export const CampaignSection: React.FC<CampaignSectionProps> = ({
  progression,
  onSelectAndLaunch,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <section id="campaign" className="mx-auto max-w-[1360px] px-6 py-20 border-b border-white/10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <p className="text-sm font-medium text-[#E85D04] mb-2">
            01. Desert Canyon Campaign
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5EFEA] text-balance">
            Three Trails. Escalating Vertical Drops.
          </h2>
        </div>
        <p className="text-sm text-[#C2B0A2] max-w-md leading-relaxed">
          Clear each canyon sector to unlock the next ridge and earn credits for engine,
          suspension, tire, and nitrous upgrades.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {CAMPAIGN_STAGES.map((stage) => {
          const isUnlocked = stage.index <= progression.unlockedStageIndex;
          const isSelected = progression.selectedStageId === stage.id;
          const record = progression.records[stage.id];
          const imgError = failedImages[stage.id];

          return (
            <article
              key={stage.id}
              className={`flex flex-col justify-between rounded-lg border transition-colors duration-150 overflow-hidden bg-[#1B1512] ${
                isSelected ? 'border-[#E85D04]/70' : 'border-white/10'
              }`}
            >
              <div>
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[#3B1B10] to-[#17110E]">
                  {!imgError && (
                    <img
                      src={stage.imageUrl}
                      alt={`${stage.name} desert canyon motocross trail`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [stage.id]: true }))
                      }
                      className={`h-full w-full object-cover transition-transform duration-300 ${
                        isUnlocked ? 'hover:scale-[1.03]' : 'grayscale opacity-45'
                      }`}
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#1B1512] via-transparent to-black/25"
                  />
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                      <div className="flex items-center gap-2 text-sm font-medium text-[#F5EFEA]">
                        <Lock className="w-4 h-4 text-[#F59E0B]" />
                        <span>Finish Stage 0{stage.index} to Unlock</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {/* Unboxed zero-pill metadata line */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#C2B0A2]">
                    <span>Stage 0{stage.index + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{stage.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-telemetry">{stage.distanceMeters} m</span>
                  </div>

                  <h3 className="mt-2 font-display text-2xl font-bold text-[#F5EFEA]">
                    {stage.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#C2B0A2]">
                    {stage.description}
                  </p>

                  <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[#C2B0A2] block">Gold Par</span>
                      <span className="mt-0.5 font-mono-telemetry font-semibold text-[#F59E0B] block">
                        {stage.goldTimeSec.toFixed(1)}s
                      </span>
                    </div>
                    <div>
                      <span className="text-[#C2B0A2] block">Best Run</span>
                      <span className="mt-0.5 font-mono-telemetry font-semibold text-[#F5EFEA] block">
                        {record?.bestTimeSec ? `${record.bestTimeSec.toFixed(2)}s` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#C2B0A2] block">Medal</span>
                      <span className="mt-0.5 font-semibold text-[#F5EFEA] block">
                        {record?.medal ?? 'Unranked'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6">
                <button
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => onSelectAndLaunch(stage.id)}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    isUnlocked
                      ? 'bg-[#E85D04] text-white hover:bg-[#D14E00] cursor-pointer'
                      : 'bg-[#241C17] text-[#C2B0A2]/50 cursor-not-allowed border border-white/5'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>{isUnlocked ? `Ride Stage 0${stage.index + 1}` : 'Locked'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
