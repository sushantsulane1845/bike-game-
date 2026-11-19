import { useCallback, useEffect, useState } from 'react';
import { CAMPAIGN_STAGES, LIVERIES, UPGRADE_DEFS, getUpgradeCost } from '../data/campaign';
import {
  LiveryId,
  PlayerProgression,
  RideResult,
  StageRecord,
  UpgradeKey,
} from '../types/game';

const STORAGE_KEY = 'redrock_mx_progression_v1';

function createDefaultRecords(): Record<string, StageRecord> {
  const records: Record<string, StageRecord> = {};
  for (const stage of CAMPAIGN_STAGES) {
    records[stage.id] = {
      bestTimeSec: null,
      bestStuntScore: 0,
      topSpeedKmh: 0,
      maxAirtimeSec: 0,
      medal: null,
      completions: 0,
    };
  }
  return records;
}

const DEFAULT_PROGRESSION: PlayerProgression = {
  credits: 500,
  unlockedStageIndex: 0,
  selectedStageId: CAMPAIGN_STAGES[0].id,
  activeLivery: 'burnt-canyon',
  ownedLiveries: ['burnt-canyon'],
  upgrades: {
    engine: 1,
    suspension: 1,
    tires: 1,
    nitro: 1,
  },
  records: createDefaultRecords(),
};

function loadInitialProgression(): PlayerProgression {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESSION;
    const parsed = JSON.parse(raw) as Partial<PlayerProgression>;
    return {
      ...DEFAULT_PROGRESSION,
      ...parsed,
      upgrades: {
        ...DEFAULT_PROGRESSION.upgrades,
        ...(parsed.upgrades ?? {}),
      },
      records: {
        ...createDefaultRecords(),
        ...(parsed.records ?? {}),
      },
      ownedLiveries: Array.isArray(parsed.ownedLiveries) && parsed.ownedLiveries.length > 0
        ? parsed.ownedLiveries
        : ['burnt-canyon'],
    };
  } catch {
    return DEFAULT_PROGRESSION;
  }
}

export function useProgression() {
  const [progression, setProgression] = useState<PlayerProgression>(loadInitialProgression);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progression));
    } catch {
      // Ignore storage quota errors
    }
  }, [progression]);

  const selectStage = useCallback((stageId: string) => {
    setProgression((prev) => ({
      ...prev,
      selectedStageId: stageId,
    }));
  }, []);

  const purchaseUpgrade = useCallback((key: UpgradeKey): boolean => {
    let success = false;
    setProgression((prev) => {
      const currentLevel = prev.upgrades[key];
      const def = UPGRADE_DEFS.find((u) => u.key === key);
      if (!def || currentLevel >= def.maxLevel) return prev;
      const cost = getUpgradeCost(key, currentLevel);
      if (prev.credits < cost) return prev;
      success = true;
      return {
        ...prev,
        credits: prev.credits - cost,
        upgrades: {
          ...prev.upgrades,
          [key]: currentLevel + 1,
        },
      };
    });
    return success;
  }, []);

  const selectOrBuyLivery = useCallback((liveryId: LiveryId): boolean => {
    const livery = LIVERIES.find((l) => l.id === liveryId);
    if (!livery) return false;
    let success = false;
    setProgression((prev) => {
      if (prev.ownedLiveries.includes(liveryId)) {
        success = true;
        return { ...prev, activeLivery: liveryId };
      }
      if (prev.credits < livery.cost) return prev;
      success = true;
      return {
        ...prev,
        credits: prev.credits - livery.cost,
        ownedLiveries: [...prev.ownedLiveries, liveryId],
        activeLivery: liveryId,
      };
    });
    return success;
  }, []);

  const commitRideResult = useCallback(
    (
      stageId: string,
      elapsedSec: number,
      stuntScore: number,
      topSpeedKmh: number,
      maxAirtimeSec: number
    ): RideResult => {
      const stage = CAMPAIGN_STAGES.find((s) => s.id === stageId) ?? CAMPAIGN_STAGES[0];
      const medal: 'Gold' | 'Silver' | 'Bronze' =
        elapsedSec <= stage.goldTimeSec
          ? 'Gold'
          : elapsedSec <= stage.silverTimeSec
          ? 'Silver'
          : 'Bronze';

      const medalMultiplier = medal === 'Gold' ? 1.5 : medal === 'Silver' ? 1.2 : 1.0;
      const stuntBonus = Math.round(stuntScore * 0.14);
      const creditsEarned = Math.round(stage.baseReward * medalMultiplier + stuntBonus);

      let isNewBestTime = false;
      let unlockedNextStage = false;

      setProgression((prev) => {
        const existing = prev.records[stageId] ?? {
          bestTimeSec: null,
          bestStuntScore: 0,
          topSpeedKmh: 0,
          maxAirtimeSec: 0,
          medal: null,
          completions: 0,
        };
        isNewBestTime = existing.bestTimeSec === null || elapsedSec < existing.bestTimeSec;

        const medalRank = { Gold: 3, Silver: 2, Bronze: 1 };
        const bestMedal =
          !existing.medal || medalRank[medal] > medalRank[existing.medal]
            ? medal
            : existing.medal;

        const nextUnlocked = Math.max(
          prev.unlockedStageIndex,
          Math.min(CAMPAIGN_STAGES.length - 1, stage.index + 1)
        );
        unlockedNextStage = nextUnlocked > prev.unlockedStageIndex;

        return {
          ...prev,
          credits: prev.credits + creditsEarned,
          unlockedStageIndex: nextUnlocked,
          records: {
            ...prev.records,
            [stageId]: {
              bestTimeSec: isNewBestTime ? elapsedSec : existing.bestTimeSec,
              bestStuntScore: Math.max(existing.bestStuntScore, stuntScore),
              topSpeedKmh: Math.max(existing.topSpeedKmh, topSpeedKmh),
              maxAirtimeSec: Math.max(existing.maxAirtimeSec, maxAirtimeSec),
              medal: bestMedal,
              completions: existing.completions + 1,
            },
          },
        };
      });

      return {
        stageId,
        elapsedSec,
        stuntScore,
        topSpeedKmh,
        maxAirtimeSec,
        medal,
        creditsEarned,
        isNewBestTime,
        unlockedNextStage,
      };
    },
    []
  );

  const resetProgression = useCallback(() => {
    const fresh: PlayerProgression = {
      ...DEFAULT_PROGRESSION,
      records: createDefaultRecords(),
    };
    setProgression(fresh);
  }, []);

  return {
    progression,
    selectStage,
    purchaseUpgrade,
    selectOrBuyLivery,
    commitRideResult,
    resetProgression,
  };
}
