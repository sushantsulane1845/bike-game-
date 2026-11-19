import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { CAMPAIGN_STAGES } from '../data/campaign';
import { PlayerProgression } from '../types/game';

interface TelemetrySectionProps {
  progression: PlayerProgression;
  onLaunchStage: (stageId: string) => void;
  onResetProgression: () => void;
}

const KEY_MAPPINGS = [
  { keys: 'W / Up Arrow', action: 'Throttle & Forward Drive' },
  { keys: 'S / Down Arrow', action: 'Rear Brake & Reverse' },
  { keys: 'A / D or Left / Right', action: 'Carve Berm Lean & Air Whip' },
  { keys: 'Space', action: 'Kicker Pop & Mid-Air Spin Trigger' },
  { keys: 'Q / E', action: 'Mid-Air Backflip / Frontflip Pitch' },
  { keys: 'Shift', action: 'Nitrous Canister Boost' },
  { keys: 'C / R / H', action: 'Switch Camera · Reset Sector · Toggle HUD' },
];

export const TelemetrySection: React.FC<TelemetrySectionProps> = ({
  progression,
  onLaunchStage,
  onResetProgression,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <section id="telemetry" className="mx-auto max-w-[1360px] px-6 py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Stage Telemetry Records Table */}
        <div className="lg:col-span-7">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-[#E85D04] mb-2">
                03. Stage Telemetry Logs
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5EFEA]">
                Personal Best Benchmarks
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#1B1512]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-medium text-[#C2B0A2]">
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">Best Time</th>
                  <th className="py-3.5 px-4">Stunt Score</th>
                  <th className="py-3.5 px-4">Top Speed</th>
                  <th className="py-3.5 px-4">Max Air</th>
                  <th className="py-3.5 px-4 text-right">Medal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {CAMPAIGN_STAGES.map((stage) => {
                  const rec = progression.records[stage.id];
                  const unlocked = stage.index <= progression.unlockedStageIndex;

                  return (
                    <tr
                      key={stage.id}
                      onClick={() => unlocked && onLaunchStage(stage.id)}
                      className={`transition-colors duration-150 ${
                        unlocked ? 'hover:bg-[#241C17] cursor-pointer' : 'opacity-50'
                      }`}
                    >
                      <td className="py-4 px-4 font-medium text-[#F5EFEA] whitespace-nowrap">
                        0{stage.index + 1}. {stage.name}
                      </td>
                      <td className="py-4 px-4 font-mono-telemetry text-[#F5EFEA] whitespace-nowrap">
                        {rec?.bestTimeSec ? `${rec.bestTimeSec.toFixed(2)}s` : '—'}
                      </td>
                      <td className="py-4 px-4 font-mono-telemetry text-[#F59E0B] whitespace-nowrap">
                        {rec?.bestStuntScore ? rec.bestStuntScore.toLocaleString() : '—'}
                      </td>
                      <td className="py-4 px-4 font-mono-telemetry text-[#C2B0A2] whitespace-nowrap">
                        {rec?.topSpeedKmh ? `${rec.topSpeedKmh} km/h` : '—'}
                      </td>
                      <td className="py-4 px-4 font-mono-telemetry text-[#C2B0A2] whitespace-nowrap">
                        {rec?.maxAirtimeSec ? `${rec.maxAirtimeSec.toFixed(2)}s` : '—'}
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-[#F5EFEA] whitespace-nowrap">
                        {rec?.medal ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-[#C2B0A2]">
            <span>Click any unlocked row to launch directly into that canyon trail.</span>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 text-[#C2B0A2] hover:text-[#F5EFEA] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Save Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-[#F59E0B]">Clear all credits &amp; records?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetProgression();
                    setConfirmReset(false);
                  }}
                  className="font-semibold text-[#E85D04] hover:underline cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="text-[#C2B0A2] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls & Stunt Physics Breakdown */}
        <div id="controls" className="lg:col-span-5">
          <p className="text-sm font-medium text-[#E85D04] mb-2">
            04. Riding Controls
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5EFEA] mb-6">
            Keyboard &amp; Touch Setup
          </h2>

          <div className="rounded-lg border border-white/10 bg-[#1B1512] divide-y divide-white/10">
            {KEY_MAPPINGS.map((item) => (
              <div
                key={item.keys}
                className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm"
              >
                <span className="font-mono-telemetry text-xs font-semibold text-[#F59E0B] whitespace-nowrap">
                  {item.keys}
                </span>
                <span className="text-[#D8C9BE] text-right">{item.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
