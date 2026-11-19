import React from 'react';
import { AppViewMode } from '../types/game';

interface TopBarProps {
  viewMode: AppViewMode;
  onLaunchRide: () => void;
  onNavigateSection: (id: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  viewMode,
  onLaunchRide,
  onNavigateSection,
}) => {
  if (viewMode === 'ride') return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#110E0C]/95">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection('hero');
          }}
          className="font-display text-2xl font-bold tracking-tight text-[#F5EFEA] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E85D04]"
        >
          REDROCK MX
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#C2B0A2]"
        >
          <a
            href="#campaign"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('campaign');
            }}
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F5EFEA] hover:underline underline-offset-4"
          >
            Campaign
          </a>
          <a
            href="#garage"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('garage');
            }}
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F5EFEA] hover:underline underline-offset-4"
          >
            Garage
          </a>
          <a
            href="#telemetry"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('telemetry');
            }}
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F5EFEA] hover:underline underline-offset-4"
          >
            Telemetry
          </a>
          <a
            href="#controls"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('controls');
            }}
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F5EFEA] hover:underline underline-offset-4"
          >
            Controls
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onLaunchRide}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#E85D04] rounded-md transition-colors duration-150 hover:bg-[#D14E00] active:translate-y-px whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
          >
            Launch Ride
          </button>
        </div>
      </div>
    </header>
  );
};
