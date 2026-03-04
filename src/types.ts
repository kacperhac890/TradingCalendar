export interface TradingPlan {
  id: string;
  name: string;
  initialBalance: number;
  dailyProfitPercent: number;
  dailyRiskPercent: number;
  levelsCount: number;
  completedLevels: Record<number, boolean>;
}

export interface LevelData {
  level: number;
  balance: number;
  profitTarget: number;
  endingBalance: number;
  risk: number;
  completed: boolean;
}
