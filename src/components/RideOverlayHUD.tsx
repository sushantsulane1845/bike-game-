import React from 'react';
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CameraMode, RideInputState, StageDefinition, TelemetryFrame } from '../types/game';

interface RideOverlayHUDProps {
  stage: StageDefinition;
  telemetry: TelemetryFrame;
  cameraMode: CameraMode;
  muted: boolean;
  hudCollapsed: boolean;
  showTouchControls: boolean;
  onToggleHud: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onToggleTouch: () => void;
  onTogglePause: () => void;
  onResetSector: () => void;
  onExitRide: () => void;
  onTouchInput: (key: keyof RideInputState, active: boolean) => void;
}

export const RideOverlayHUD: React.FC<RideOverlayHUDProps> = ({
  stage,
  telemetry,
  cameraMode,
  muted,
  hudCollapsed,
  showTouchControls,
  onToggleHud,
  onCycleCamera,
  onToggleMute,
  onToggleTouch,
  onTogglePause,
  onResetSector,
  onExitRide,
  onTouchInput,
}) => {
  const cameraLabel =
    cameraMode === 'chase' ? 'Chase' : cameraMode === 'heli' ? 'Heli-Cam' : 'Helmet FPV';

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem.toFixed(2)}`;
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Row: Left Stage Split & Right Stunt Score */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Stage & Clock */}
        <div className="pointer-events-auto flex flex-col gap-2 rounded-md border border-white/15 bg-[#110E0C]/88 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExitRide}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C2B0A2] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Site</span>
            </button>
            <span aria-hidden="true" className="text-white/25">/</span>
            <span className="font-display text-lg font-bold tracking-wide text-[#F5EFEA] whitespace-nowrap">
              {stage.name}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[#C2B0A2] mr-1.5">Time</span>
              <span className="font-mono-telemetry font-semibold text-[#F5EFEA]">
                {formatTime(telemetry.elapsedSec)}
              </span>
            </div>
            <span aria-hidden="true" className="text-white/20">·</span>
            <div>
              <span className="text-[#C2B0A2] mr-1.5">Progress</span>
              <span className="font-mono-telemetry font-semibold text-[#F59E0B]">
                {Math.round(telemetry.progress * 100)}%
              </span>
            </div>
          </div>

          {/* Slim track progress bar */}
          <div className="h-1 w-48 rounded-xs bg-white/15 overflow-hidden">
            <div
              className="h-full bg-[#E85D04] transition-transform duration-100 origin-left"
              style={{ transform: `scaleX(${Math.max(0.02, telemetry.progress)})` }}
            />
          </div>
        </div>

        {/* Top-Center: Dynamic Stunt & Airtime Callout */}
        {(telemetry.isAirborne || telemetry.activeStuntLabel) && (
          <div className="hidden sm:flex flex-col items-center rounded-md border border-[#E85D04]/50 bg-[#110E0C]/90 px-5 py-2.5 text-center">
            {telemetry.isAirborne ? (
              <div className="font-mono-telemetry text-sm font-semibold text-[#F59E0B]">
                AIRTIME {telemetry.airtimeSec.toFixed(2)}s · PITCH {telemetry.pitchDeg}°
              </div>
            ) : (
              <div className="font-display text-xl font-bold tracking-wide text-[#F59E0B]">
                {telemetry.activeStuntLabel}
              </div>
            )}
          </div>
        )}

        {/* Top-Right: Stunt Score & Combo */}
        <div className="pointer-events-auto rounded-md border border-white/15 bg-[#110E0C]/88 px-4 py-3 text-right">
          <div className="text-xs text-[#C2B0A2]">
            Stunt Score · x{telemetry.comboMultiplier} Combo
          </div>
          <div className="font-mono-telemetry text-2xl font-semibold text-[#F59E0B]">
            {telemetry.stuntScore.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Pause Banner if Paused */}
      {telemetry.isPaused && !telemetry.isFinished && (
        <div className="pointer-events-auto self-center rounded-lg border border-white/20 bg-[#110E0C]/95 px-8 py-6 text-center">
          <h3 className="font-display text-3xl font-bold text-[#F5EFEA]">Ride Paused</h3>
          <p className="mt-1 text-sm text-[#C2B0A2]">
            Resume to continue through {stage.name}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onTogglePause}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#E85D04] rounded-md hover:bg-[#D14E00] cursor-pointer"
            >
              Resume Ride
            </button>
            <button
              type="button"
              onClick={onResetSector}
              className="px-4 py-2.5 text-sm font-medium text-[#F5EFEA] border border-white/20 rounded-md hover:border-white/40 cursor-pointer"
            >
              Reset Sector
            </button>
            <button
              type="button"
              onClick={onExitRide}
              className="px-4 py-2.5 text-sm font-medium text-[#C2B0A2] hover:text-white cursor-pointer"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {/* Optional On-Screen Touch Pedals */}
      {showTouchControls && !telemetry.isPaused && !telemetry.isFinished && (
        <div className="pointer-events-auto flex items-end justify-between gap-4 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={() => onTouchInput('left', true)}
              onPointerUp={() => onTouchInput('left', false)}
              onPointerLeave={() => onTouchInput('left', false)}
              className="h-14 w-16 rounded-md border border-white/20 bg-[#110E0C]/85 text-sm font-semibold text-white active:bg-[#E85D04]"
            >
              Left
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchInput('right', true)}
              onPointerUp={() => onTouchInput('right', false)}
              onPointerLeave={() => onTouchInput('right', false)}
              className="h-14 w-16 rounded-md border border-white/20 bg-[#110E0C]/85 text-sm font-semibold text-white active:bg-[#E85D04]"
            >
              Right
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={() => onTouchInput('jumpWhip', true)}
              onPointerUp={() => onTouchInput('jumpWhip', false)}
              onPointerLeave={() => onTouchInput('jumpWhip', false)}
              className="h-14 px-4 rounded-md border border-white/20 bg-[#110E0C]/85 text-xs font-semibold text-[#F59E0B] active:bg-[#E85D04] active:text-white"
            >
              Whip
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchInput('nitro', true)}
              onPointerUp={() => onTouchInput('nitro', false)}
              onPointerLeave={() => onTouchInput('nitro', false)}
              className="h-14 px-4 rounded-md border border-[#E85D04]/60 bg-[#E85D04]/25 text-xs font-semibold text-white active:bg-[#E85D04]"
            >
              Nitro
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchInput('brake', true)}
              onPointerUp={() => onTouchInput('brake', false)}
              onPointerLeave={() => onTouchInput('brake', false)}
              className="h-14 px-4 rounded-md border border-white/20 bg-[#110E0C]/85 text-xs font-semibold text-[#C2B0A2]"
            >
              Brake
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchInput('throttle', true)}
              onPointerUp={() => onTouchInput('throttle', false)}
              onPointerLeave={() => onTouchInput('throttle', false)}
              className="h-14 px-6 rounded-md bg-[#E85D04] text-sm font-semibold text-white active:bg-[#D14E00]"
            >
              Gas
            </button>
          </div>
        </div>
      )}

      {/* Bottom Collapsible Telemetry & Control Dock */}
      <div className="self-center flex flex-col items-center">
        <button
          type="button"
          onClick={onToggleHud}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-t-md border border-b-0 border-white/15 bg-[#110E0C]/90 px-3 py-1 text-[11px] font-medium text-[#C2B0A2] hover:text-white cursor-pointer"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls [H]</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls [H]</span>
            </>
          )}
        </button>

        {!hudCollapsed && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-5 rounded-md border border-white/15 bg-[#110E0C]/92 px-5 py-3 max-w-[94vw]">
            {/* Speed & Gear */}
            <div className="flex items-baseline gap-2.5 pr-4 border-r border-white/10">
              <span className="font-mono-telemetry text-3xl font-semibold text-[#F5EFEA]">
                {telemetry.speedKmh}
              </span>
              <span className="text-xs text-[#C2B0A2]">km/h</span>
              <span className="font-mono-telemetry text-xs font-semibold text-[#F59E0B] ml-1">
                G{telemetry.gear}
              </span>
            </div>

            {/* RPM & Nitro Bars */}
            <div className="flex items-center gap-4 pr-4 border-r border-white/10">
              <div className="w-24">
                <div className="flex justify-between text-[11px] text-[#C2B0A2] mb-1">
                  <span>RPM</span>
                  <span className="font-mono-telemetry">{Math.round(telemetry.rpm * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] origin-left"
                    style={{ transform: `scaleX(${telemetry.rpm})` }}
                  />
                </div>
              </div>

              <div className="w-24">
                <div className="flex justify-between text-[11px] text-[#C2B0A2] mb-1">
                  <span>Nitro</span>
                  <span className="font-mono-telemetry">{Math.round(telemetry.nitro * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-[#E85D04] origin-left"
                    style={{ transform: `scaleX(${telemetry.nitro})` }}
                  />
                </div>
              </div>
            </div>

            {/* Utility Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCycleCamera}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#F5EFEA] bg-[#1B1512] border border-white/10 rounded hover:border-[#E85D04] cursor-pointer whitespace-nowrap"
              >
                <Camera className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{cameraLabel}</span>
              </button>

              <button
                type="button"
                onClick={onResetSector}
                title="Reset to last sector (R)"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#C2B0A2] bg-[#1B1512] border border-white/10 rounded hover:text-white cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="p-1.5 text-[#C2B0A2] bg-[#1B1512] border border-white/10 rounded hover:text-white cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onToggleTouch}
                aria-label="Toggle touch controls"
                title="Toggle on-screen touch pedals"
                className={`p-1.5 border rounded cursor-pointer ${
                  showTouchControls
                    ? 'text-[#F59E0B] bg-[#241C17] border-[#E85D04]'
                    : 'text-[#C2B0A2] bg-[#1B1512] border-white/10 hover:text-white'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onTogglePause}
                aria-label={telemetry.isPaused ? 'Resume ride' : 'Pause ride'}
                className="p-1.5 text-[#C2B0A2] bg-[#1B1512] border border-white/10 rounded hover:text-white cursor-pointer"
              >
                {telemetry.isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
