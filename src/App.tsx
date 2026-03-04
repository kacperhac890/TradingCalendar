import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, DollarSign, TrendingUp, AlertTriangle, ListOrdered, Calculator, Check, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Analytics } from '@vercel/analytics/react';
import { TradingPlan, LevelData } from './types';

const DEFAULT_PLAN: TradingPlan = {
  id: '1',
  name: 'Mój pierwszy plan',
  initialBalance: 5,
  dailyProfitPercent: 20,
  dailyRiskPercent: 15,
  levelsCount: 30,
  completedLevels: {}
};

export default function App() {
  const [plans, setPlans] = useState<TradingPlan[]>(() => {
    const saved = localStorage.getItem('tradingPlans');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse plans", e);
      }
    }
    return [DEFAULT_PLAN];
  });

  const [activePlanId, setActivePlanId] = useState<string>(plans[0]?.id);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [currencies, setCurrencies] = useState<string[]>(['USD', 'PLN', 'EUR', 'GBP']);
  const [targetCurrency, setTargetCurrency] = useState('PLN');

  useEffect(() => {
    localStorage.setItem('tradingPlans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setRates(data.rates);
          setCurrencies(Object.keys(data.rates));
        }
      })
      .catch(err => console.error("Failed to fetch rates", err));
  }, []);

  const activePlan = plans.find(p => p.id === activePlanId) || plans[0];

  const updateActivePlan = (updates: Partial<TradingPlan>) => {
    setPlans(plans.map(p => p.id === activePlanId ? { ...p, ...updates } : p));
  };

  const toggleLevel = (level: number) => {
    const newCompleted = { 
      ...activePlan.completedLevels, 
      [level]: !activePlan.completedLevels[level] 
    };
    updateActivePlan({ completedLevels: newCompleted });
  };

  const addNewPlan = () => {
    const newPlan: TradingPlan = {
      id: Date.now().toString(),
      name: `Nowy Plan ${plans.length + 1}`,
      initialBalance: 100,
      dailyProfitPercent: 5,
      dailyRiskPercent: 2,
      levelsCount: 20,
      completedLevels: {}
    };
    setPlans([...plans, newPlan]);
    setActivePlanId(newPlan.id);
  };

  const deletePlan = (id: string) => {
    if (plans.length === 1) return;
    const newPlans = plans.filter(p => p.id !== id);
    setPlans(newPlans);
    if (activePlanId === id) {
      setActivePlanId(newPlans[0].id);
    }
  };

  const levels = useMemo(() => {
    const result: LevelData[] = [];
    let currentBalance = activePlan.initialBalance || 0;
    const profitRatio = (activePlan.dailyProfitPercent || 0) / 100;
    const riskRatio = (activePlan.dailyRiskPercent || 0) / 100;
    const count = activePlan.levelsCount || 0;

    for (let i = 1; i <= count; i++) {
      const profitTarget = currentBalance * profitRatio;
      const endingBalance = currentBalance + profitTarget;
      const risk = currentBalance * riskRatio;
      
      result.push({
        level: i,
        balance: currentBalance,
        profitTarget,
        endingBalance,
        risk,
        completed: activePlan.completedLevels[i] || false
      });
      
      currentBalance = endingBalance;
    }
    return result;
  }, [activePlan]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const finalAmount = levels.length > 0 ? levels[levels.length - 1].endingBalance : (activePlan.initialBalance || 0);
  const exchangeRate = rates[targetCurrency] || 1;
  const convertedFinalAmount = finalAmount * exchangeRate;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 flex font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <div className="w-72 bg-[#09090b] border-r border-white/5 flex-col hidden lg:flex shrink-0 z-20">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Calculator size={16} className="text-emerald-400" />
            </div>
            TradePlan
          </h1>
        </div>
        
        <div className="px-4 pb-4">
          <button 
            onClick={addNewPlan} 
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-zinc-300 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Nowy Plan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          <AnimatePresence>
            {plans.map(plan => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                  activePlanId === plan.id
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                }`}
                onClick={() => setActivePlanId(plan.id)}
              >
                <span className="text-sm font-medium truncate pr-2">{plan.name}</span>
                {plans.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="px-6 lg:px-8 pt-8 pb-6">
            <input 
              type="text" 
              value={activePlan.name}
              onChange={e => updateActivePlan({ name: e.target.value })}
              className="text-3xl font-semibold bg-transparent border-none outline-none text-white focus:ring-0 p-0 placeholder-zinc-700 w-full"
              placeholder="Nazwa planu..."
            />
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 px-6 lg:px-8 pb-6">
            {/* Kwota początkowa */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden group focus-within:border-emerald-500/30 focus-within:bg-emerald-500/[0.02] transition-all">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <DollarSign size={14} className="text-emerald-500" />
                Kwota początkowa
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-zinc-500 font-mono text-lg">$</span>
                <input 
                  type="number" 
                  value={activePlan.initialBalance || ''}
                  onChange={e => updateActivePlan({ initialBalance: parseFloat(e.target.value) })}
                  className="bg-transparent w-full text-white outline-none font-mono text-2xl font-medium"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Dzienny zysk */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden group focus-within:border-emerald-500/30 focus-within:bg-emerald-500/[0.02] transition-all">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-500" />
                Dzienny zysk
              </label>
              <div className="flex items-baseline gap-1">
                <input 
                  type="number" 
                  value={activePlan.dailyProfitPercent || ''}
                  onChange={e => updateActivePlan({ dailyProfitPercent: parseFloat(e.target.value) })}
                  className="bg-transparent w-full text-white outline-none font-mono text-2xl font-medium"
                  placeholder="0"
                />
                <span className="text-zinc-500 font-mono text-lg">%</span>
              </div>
            </div>

            {/* Max Ryzyko */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden group focus-within:border-rose-500/30 focus-within:bg-rose-500/[0.02] transition-all">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-500" />
                Max Ryzyko
              </label>
              <div className="flex items-baseline gap-1">
                <input 
                  type="number" 
                  value={activePlan.dailyRiskPercent || ''}
                  onChange={e => updateActivePlan({ dailyRiskPercent: parseFloat(e.target.value) })}
                  className="bg-transparent w-full text-white outline-none font-mono text-2xl font-medium"
                  placeholder="0"
                />
                <span className="text-zinc-500 font-mono text-lg">%</span>
              </div>
            </div>

            {/* Ilość leveli */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden group focus-within:border-blue-500/30 focus-within:bg-blue-500/[0.02] transition-all">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ListOrdered size={14} className="text-blue-500" />
                Ilość leveli
              </label>
              <div className="flex items-baseline gap-1">
                <input 
                  type="number" 
                  value={activePlan.levelsCount || ''}
                  onChange={e => updateActivePlan({ levelsCount: parseInt(e.target.value, 10) })}
                  className="bg-transparent w-full text-white outline-none font-mono text-2xl font-medium"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Chart */}
          {levels.length > 0 && (
            <div className="px-6 lg:px-8 pb-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 h-72 relative">
                <div className="absolute top-5 left-5 flex items-center gap-2 text-zinc-400">
                  <BarChart3 size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Projekcja wzrostu</span>
                </div>
                <div className="w-full h-full pt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={levels} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                      <XAxis 
                        dataKey="level" 
                        stroke="#52525b" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => `Lvl ${val}`}
                        minTickGap={20}
                      />
                      <YAxis 
                        stroke="#52525b" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff10', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}
                        formatter={(value: number) => [`$${formatNumber(value)}`, 'Balance']}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                        labelFormatter={(label) => `Level ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="endingBalance" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorBalance)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="px-6 lg:px-8 pb-6">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-[#09090b]/95 backdrop-blur-xl border-b border-white/5">
                    <tr>
                      <th className="p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-center w-20">Level</th>
                      <th className="p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Balance</th>
                      <th className="p-4 text-[11px] font-semibold text-emerald-500/70 uppercase tracking-wider text-right">Profit Target</th>
                      <th className="p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Ending Balance</th>
                      <th className="p-4 text-[11px] font-semibold text-rose-500/70 uppercase tracking-wider text-right">Risk</th>
                      <th className="p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map(l => (
                      <tr 
                        key={l.level} 
                        className={`group border-b border-white/5 transition-colors ${l.completed ? 'bg-emerald-950/10' : 'hover:bg-white/[0.02]'}`}
                      >
                        <td className="p-4 text-zinc-500 font-mono text-sm text-center">{l.level}</td>
                        <td className="p-4 font-mono text-zinc-300 text-right">{formatNumber(l.balance)}</td>
                        <td className="p-4 font-mono text-emerald-400/90 text-right">+{formatNumber(l.profitTarget)}</td>
                        <td className="p-4 font-mono text-zinc-100 font-medium text-right">{formatNumber(l.endingBalance)}</td>
                        <td className="p-4 font-mono text-rose-400/90 text-right">-{formatNumber(l.risk)}</td>
                        <td className="p-4 flex justify-center">
                          <button
                            onClick={() => toggleLevel(l.level)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                              l.completed 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-white/5 border border-white/10 text-transparent hover:border-white/20'
                            }`}
                          >
                            <Check size={14} className={l.completed ? 'opacity-100' : 'opacity-0'} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {levels.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-zinc-500 text-sm">
                          Brak leveli do wyświetlenia. Skonfiguruj plan powyżej.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 bg-[#09090b]/80 backdrop-blur-xl p-5 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 z-20">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5">
            <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider pl-3">Waluta</span>
            <select 
              value={targetCurrency}
              onChange={e => setTargetCurrency(e.target.value)}
              className="bg-zinc-800/50 border-none text-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm font-medium cursor-pointer appearance-none"
            >
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="text-right flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Szacunkowy wynik</div>
              <div className="text-sm text-zinc-400 font-mono">≈ {formatNumber(finalAmount)} USD</div>
            </div>
            <div className="h-10 w-px bg-white/10 hidden sm:block"></div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-emerald-400 tracking-tight">
                {formatNumber(convertedFinalAmount)}
              </span>
              <span className="text-lg text-emerald-500/50 font-medium">{targetCurrency}</span>
            </div>
          </div>
        </div>
      </div>
      <Analytics />
    </div>
  );
}
