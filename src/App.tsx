import { useCallback, useState } from 'react';
import { CampaignSection } from './components/CampaignSection';
import { GarageSection } from './components/GarageSection';
import { HeroSection } from './components/HeroSection';
import { RideViewport } from './components/RideViewport';
import { TelemetrySection } from './components/TelemetrySection';
import { TopBar } from './components/TopBar';
import { useProgression } from './store/useProgression';
import { AppViewMode } from './types/game';

export default function App() {
  const {
    progression,
    selectStage,
    purchaseUpgrade,
    selectOrBuyLivery,
    commitRideResult,
    resetProgression,
  } = useProgression();

  const [viewMode, setViewMode] = useState<AppViewMode>('site');
  const [activeRideStageId, setActiveRideStageId] = useState<string>(
    progression.selectedStageId
  );

  const handleLaunchRide = useCallback(
    (stageId?: string) => {
      const targetId = stageId ?? progression.selectedStageId;
      selectStage(targetId);
      setActiveRideStageId(targetId);
      setViewMode('ride');
    },
    [progression.selectedStageId, selectStage]
  );

  const handleNavigateSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleOpenGarageFromRide = useCallback(() => {
    setViewMode('site');
    window.setTimeout(() => {
      document.getElementById('garage')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  }, []);

  return (
    <div className="min-h-screen bg-[#110E0C] text-[#F5EFEA]">
      <TopBar
        viewMode={viewMode}
        onLaunchRide={() => handleLaunchRide()}
        onNavigateSection={handleNavigateSection}
      />

      {viewMode === 'site' ? (
        <main>
          <HeroSection
            progression={progression}
            onLaunchRide={handleLaunchRide}
            onScrollToCampaign={() => handleNavigateSection('campaign')}
          />

          <CampaignSection
            progression={progression}
            onSelectAndLaunch={(id) => handleLaunchRide(id)}
          />

          <GarageSection
            progression={progression}
            onPurchaseUpgrade={purchaseUpgrade}
            onSelectOrBuyLivery={selectOrBuyLivery}
          />

          <TelemetrySection
            progression={progression}
            onLaunchStage={(id) => handleLaunchRide(id)}
            onResetProgression={resetProgression}
          />

          <footer className="border-t border-white/10 bg-[#16110E]">
            <div className="mx-auto flex max-w-[1360px] flex-col sm:flex-row items-center justify-between gap-4 px-6 py-8 text-xs text-[#C2B0A2]">
              <span className="font-display text-base font-bold text-[#F5EFEA]">
                REDROCK MX
              </span>
              <div className="flex items-center gap-6">
                <a href="#campaign" className="hover:text-white transition-colors">
                  Campaign
                </a>
                <a href="#garage" className="hover:text-white transition-colors">
                  3D Garage
                </a>
                <a href="#telemetry" className="hover:text-white transition-colors">
                  Telemetry
                </a>
                <a href="#controls" className="hover:text-white transition-colors">
                  Controls
                </a>
              </div>
              <span>Sunset Canyon Motocross · WebGL 3D</span>
            </div>
          </footer>
        </main>
      ) : (
        <RideViewport
          stageId={activeRideStageId}
          progression={progression}
          onCommitResult={commitRideResult}
          onSelectStage={(nextId) => {
            selectStage(nextId);
            setActiveRideStageId(nextId);
          }}
          onOpenGarage={handleOpenGarageFromRide}
          onExitSite={() => setViewMode('site')}
        />
      )}
    </div>
  );
}
