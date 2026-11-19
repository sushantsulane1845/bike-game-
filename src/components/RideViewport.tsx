import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CAMPAIGN_STAGES, HERO_FALLBACK_IMAGE } from '../data/campaign';
import { MotocrossEngine } from '../engine/MotocrossEngine';
import {
  CameraMode,
  PlayerProgression,
  RideInputState,
  RideResult,
  TelemetryFrame,
} from '../types/game';
import { RideOverlayHUD } from './RideOverlayHUD';
import { StageFinishModal } from './StageFinishModal';

interface RideViewportProps {
  stageId: string;
  progression: PlayerProgression;
  onCommitResult: (
    stageId: string,
    elapsedSec: number,
    stuntScore: number,
    topSpeedKmh: number,
    maxAirtimeSec: number
  ) => RideResult;
  onSelectStage: (stageId: string) => void;
  onOpenGarage: () => void;
  onExitSite: () => void;
}

const INITIAL_TELEMETRY: TelemetryFrame = {
  speedKmh: 0,
  rpm: 0.15,
  gear: 1,
  nitro: 1,
  isAirborne: false,
  airtimeSec: 0,
  lastAirtimeSec: 0,
  suspensionLoad: 0,
  leanDeg: 0,
  pitchDeg: 0,
  progress: 0.01,
  elapsedSec: 0,
  stuntScore: 0,
  comboMultiplier: 1,
  activeStuntLabel: '',
  topSpeedKmh: 0,
  maxAirtimeSec: 0,
  checkpointsPassed: 0,
  totalCheckpoints: 4,
  isFinished: false,
  isPaused: false,
};

export const RideViewport: React.FC<RideViewportProps> = ({
  stageId,
  progression,
  onCommitResult,
  onSelectStage,
  onOpenGarage,
  onExitSite,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MotocrossEngine | null>(null);
  const commitRef = useRef(onCommitResult);
  commitRef.current = onCommitResult;

  const stage =
    CAMPAIGN_STAGES.find((s) => s.id === stageId) ?? CAMPAIGN_STAGES[0];
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const [telemetry, setTelemetry] = useState<TelemetryFrame>(INITIAL_TELEMETRY);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [muted, setMuted] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(() =>
    typeof window !== 'undefined' && 'ontouchstart' in window
  );
  const [webglError, setWebglError] = useState(false);
  const [rideResult, setRideResult] = useState<RideResult | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let engine: MotocrossEngine | null = null;
    try {
      engine = new MotocrossEngine(
        container,
        stage,
        progression.activeLivery,
        progression.upgrades,
        {
          onTelemetry: (frame) => setTelemetry(frame),
          onStageFinish: (stats) => {
            const res = commitRef.current(
              stageRef.current.id,
              stats.elapsedSec,
              stats.stuntScore,
              stats.topSpeedKmh,
              stats.maxAirtimeSec
            );
            setRideResult(res);
          },
        }
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
    // Re-create engine cleanly when switching stageId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId]);

  useEffect(() => {
    engineRef.current?.setCustomization(
      progression.activeLivery,
      progression.upgrades
    );
  }, [progression.activeLivery, progression.upgrades]);

  const cycleCamera = useCallback(() => {
    setCameraMode((prev) => {
      const next: CameraMode =
        prev === 'chase' ? 'heli' : prev === 'heli' ? 'fpv' : 'chase';
      engineRef.current?.setCameraMode(next);
      return next;
    });
  }, []);

  const togglePause = useCallback(() => {
    setTelemetry((prev) => {
      const nextPaused = !prev.isPaused;
      engineRef.current?.setPaused(nextPaused);
      return { ...prev, isPaused: nextPaused };
    });
  }, []);

  // Keyboard Ride Controls
  useEffect(() => {
    const mapKey = (code: string, pressed: boolean) => {
      const eng = engineRef.current;
      if (!eng) return;
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          eng.setInput({ throttle: pressed });
          break;
        case 'KeyS':
        case 'ArrowDown':
          eng.setInput({ brake: pressed });
          break;
        case 'KeyA':
        case 'ArrowLeft':
          eng.setInput({ left: pressed });
          break;
        case 'KeyD':
        case 'ArrowRight':
          eng.setInput({ right: pressed });
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          eng.setInput({ nitro: pressed });
          break;
        case 'Space':
          eng.setInput({ jumpWhip: pressed });
          break;
        case 'KeyQ':
          eng.setInput({ pitchBack: pressed });
          break;
        case 'KeyE':
          eng.setInput({ pitchForward: pressed });
          break;
        default:
          break;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) {
        if (e.code === 'KeyC') cycleCamera();
        if (e.code === 'KeyR') engineRef.current?.resetToCheckpoint();
        if (e.code === 'KeyH') setHudCollapsed((v) => !v);
        if (e.code === 'Escape') togglePause();
      }
      mapKey(e.code, true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      mapKey(e.code, false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [cycleCamera, togglePause]);

  const handleTouchInput = useCallback((key: keyof RideInputState, active: boolean) => {
    engineRef.current?.setInput({ [key]: active });
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleRetry = useCallback(() => {
    setRideResult(null);
    engineRef.current?.resetRun();
  }, []);

  const handleNextStage = useCallback(
    (nextId: string) => {
      setRideResult(null);
      onSelectStage(nextId);
    },
    [onSelectStage]
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-[#110E0C] overflow-hidden select-none"
      onPointerDown={() => engineRef.current?.initAudio()}
    >
      {!webglError ? (
        <div ref={mountRef} className="h-full w-full" />
      ) : (
        <div className="relative h-full w-full flex items-center justify-center">
          <img
            src={HERO_FALLBACK_IMAGE}
            alt="Sunset canyon motocross fallback"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="relative z-10 rounded-lg border border-white/15 bg-[#1B1512]/95 p-8 text-center max-w-md">
            <h2 className="font-display text-2xl font-bold text-[#F5EFEA]">
              WebGL Context Unavailable
            </h2>
            <p className="mt-2 text-sm text-[#C2B0A2]">
              Hardware or software 3D rendering was interrupted by the browser.
            </p>
            <button
              type="button"
              onClick={onExitSite}
              className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-[#E85D04] rounded-md cursor-pointer"
            >
              Return to Website
            </button>
          </div>
        </div>
      )}

      {!webglError && (
        <RideOverlayHUD
          stage={stage}
          telemetry={telemetry}
          cameraMode={cameraMode}
          muted={muted}
          hudCollapsed={hudCollapsed}
          showTouchControls={showTouchControls}
          onToggleHud={() => setHudCollapsed((v) => !v)}
          onCycleCamera={cycleCamera}
          onToggleMute={handleToggleMute}
          onToggleTouch={() => setShowTouchControls((v) => !v)}
          onTogglePause={togglePause}
          onResetSector={() => engineRef.current?.resetToCheckpoint()}
          onExitRide={onExitSite}
          onTouchInput={handleTouchInput}
        />
      )}

      {rideResult && (
        <StageFinishModal
          result={rideResult}
          onRetry={handleRetry}
          onNextStage={handleNextStage}
          onOpenGarage={onOpenGarage}
          onExitSite={onExitSite}
        />
      )}
    </div>
  );
};
