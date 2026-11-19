import React from 'react';
import { ArrowRight, RotateCcw, Wrench } from 'lucide-react';
import { CAMPAIGN_STAGES } from '../data/campaign';
import { RideResult } from '../types/game';

interface StageFinishModalProps {
  result: RideResult;
  onRetry: () => void;
  onNextStage: (stageId: string) => void;
  onOpenGarage: () => void;
  onExitSite: () => void;
}

export const StageFinishModal: React.FC<StageFinishModalProps> = ({
  result,
  onRetry,
  onNextStage,
  onOpenGarage,
  onExitSite,
}) => {
  const stage =
    CAMPAIGN_STAGES.find((s) => s.id === result.stageId) ?? CAMPAIGN_STAGES[0];
  const nextStage = CAMPAIGN_STAGES[stage.index + 1];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg rounded-lg border border-white/15 bg-[#1B1512] p-7">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-medium text-[#F59E0B]">
              Stage 0{stage.index + 1} Complete · {result.medal} Medal
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold text-[#F5EFEA]">
              {stage.name}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#C2B0A2] block">Credits Earned</span>
            <span className="font-mono-telemetry text-2xl font-semibold text-[#F59E0B]">
              +{result.creditsEarned.toLocaleString()} CR
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-5">
          <div>
            <span className="text-xs text-[#C2B0A2] block">Run Time</span>
            <span className="mt-0.5 font-mono-telemetry text-2xl font-semibold text-[#F5EFEA] block">
              {result.elapsedSec.toFixed(2)}s
            </span>
            {result.isNewBestTime && (
              <span className="text-xs font-medium text-[#F59E0B]">New Stage Record</span>
            )}
          </div>

          <div>
            <span className="text-xs text-[#C2B0A2] block">Stunt Score</span>
            <span className="mt-0.5 font-mono-telemetry text-2xl font-semibold text-[#F5EFEA] block">
              {result.stuntScore.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-xs text-[#C2B0A2] block">Top Speed</span>
            <span className="mt-0.5 font-mono-telemetry text-xl font-semibold text-[#F5EFEA] block">
              {result.topSpeedKmh} km/h
            </span>
          </div>

          <div>
            <span className="text-xs text-[#C2B0A2] block">Max Airtime</span>
            <span className="mt-0.5 font-mono-telemetry text-xl font-semibold text-[#F5EFEA] block">
              {result.maxAirtimeSec.toFixed(2)}s
            </span>
          </div>
        </div>

        {result.unlockedNextStage && nextStage && (
          <div className="mt-5 rounded-md border border-[#E85D04]/40 bg-[#241C17] px-4 py-3 text-sm text-[#F5EFEA]">
            Unlocked Stage 0{nextStage.index + 1}: <strong>{nextStage.name}</strong>
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {nextStage && (
            <button
              type="button"
              onClick={() => onNextStage(nextStage.id)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#E85D04] rounded-md hover:bg-[#D14E00] cursor-pointer whitespace-nowrap"
            >
              <span>Next: {nextStage.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[#F5EFEA] bg-[#241C17] border border-white/15 rounded-md hover:border-[#E85D04] cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry</span>
          </button>

          <button
            type="button"
            onClick={onOpenGarage}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[#F5EFEA] bg-[#241C17] border border-white/15 rounded-md hover:border-[#E85D04] cursor-pointer whitespace-nowrap"
          >
            <Wrench className="w-4 h-4" />
            <span>3D Garage</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onExitSite}
          className="mt-3 w-full py-2 text-xs font-medium text-[#C2B0A2] hover:text-white cursor-pointer"
        >
          Return to Campaign Overview
        </button>
      </div>
    </div>
  );
};
