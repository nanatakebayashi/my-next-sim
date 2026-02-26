"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Home() {
  // すべての入力値を一括で管理するState（状態）
  const [params, setParams] = useState({
    budget: 250000,
    yieldRate: 5,
    rentCost: 120000,
    loanRate: 0.5,
    loanYears: 35,
    urbanPrice: 6000,
    suburbPrice: 3500,
    housePrice: 4000,
    urbanRes: 80,
    suburbRes: 40,
    houseRes: 50,
  });

  // 入力値が変わった時にStateを更新する関数
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams({ ...params, [e.target.name]: Number(e.target.value) });
  };

  // 住宅ローン関連の計算関数
  const calcMonthlyMortgage = (
    principal: number,
    annualRate: number,
    years: number,
  ) => {
    if (annualRate === 0) return principal / (years * 12);
    const r = annualRate / 100 / 12;
    const n = years * 12;
    return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  };

  const calcRemainingLoan = (
    principal: number,
    annualRate: number,
    totalYears: number,
    passedYears: number,
  ) => {
    if (annualRate === 0) return principal * (1 - passedYears / totalYears);
    const r = annualRate / 100 / 12;
    const n = totalYears * 12;
    const p = passedYears * 12;
    return (
      (principal * (Math.pow(1 + r, n) - Math.pow(1 + r, p))) /
      (Math.pow(1 + r, n) - 1)
    );
  };

  // グラフ用データの計算（paramsが変わるたびに自動で再計算される）
  const chartData = useMemo(() => {
    const yieldRateMonthly = params.yieldRate / 100 / 12;

    const urbanLoan = calcMonthlyMortgage(
      params.urbanPrice * 10000,
      params.loanRate,
      params.loanYears,
    );
    const suburbLoan = calcMonthlyMortgage(
      params.suburbPrice * 10000,
      params.loanRate,
      params.loanYears,
    );
    const houseLoan = calcMonthlyMortgage(
      params.housePrice * 10000,
      params.loanRate,
      params.loanYears,
    );

    const urbanMaint = 35000;
    const suburbMaint = 25000;
    const houseMaint = 15000;

    const scenarios = {
      rent: { label: "賃貸", cost: params.rentCost, price: 0, res: 0 },
      urban: {
        label: "分譲(都会)",
        cost: urbanLoan + urbanMaint,
        price: params.urbanPrice * 10000,
        res: params.urbanRes / 100,
      },
      suburb: {
        label: "分譲(郊外)",
        cost: suburbLoan + suburbMaint,
        price: params.suburbPrice * 10000,
        res: params.suburbRes / 100,
      },
      house: {
        label: "戸建て",
        cost: houseLoan + houseMaint,
        price: params.housePrice * 10000,
        res: params.houseRes / 100,
      },
    };

    let investBalances = { rent: 0, urban: 0, suburb: 0, house: 0 };
    const data = [];

    for (let y = 0; y <= 35; y++) {
      let currentData: any = { year: `${y}年` };

      Object.keys(scenarios).forEach((key) => {
        const sc = scenarios[key as keyof typeof scenarios];
        const currentPropValue =
          sc.price * (1 - (1 - sc.res) * (y / params.loanYears));
        const currentLoan =
          key === "rent"
            ? 0
            : calcRemainingLoan(sc.price, params.loanRate, params.loanYears, y);

        currentData[key] =
          investBalances[key as keyof typeof investBalances] +
          currentPropValue -
          currentLoan;
      });
      data.push(currentData);

      for (let m = 0; m < 12; m++) {
        Object.keys(scenarios).forEach((key) => {
          const investAmount = Math.max(
            0,
            params.budget - scenarios[key as keyof typeof scenarios].cost,
          );
          investBalances[key as keyof typeof investBalances] =
            (investBalances[key as keyof typeof investBalances] +
              investAmount) *
            (1 + yieldRateMonthly);
        });
      }
    }
    return data;
  }, [params]);

  // Tailwind CSSを使ったUI構築
  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-2">
          🏠 次世代版：資産形成シミュレーター
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          数値を変更すると、リアルタイムでグラフが更新されます。
        </p>

        {/* 入力フォーム群 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h3 className="font-semibold border-b pb-2 mb-3">📊 共通設定</h3>
            <label className="flex justify-between items-center mb-2 text-sm">
              総予算(円):{" "}
              <input
                type="number"
                name="budget"
                value={params.budget}
                onChange={handleChange}
                className="border rounded p-1 w-24 text-right"
              />
            </label>
            <label className="flex justify-between items-center text-sm">
              オルカン(年利%):{" "}
              <input
                type="number"
                name="yieldRate"
                value={params.yieldRate}
                onChange={handleChange}
                step="0.1"
                className="border rounded p-1 w-24 text-right"
              />
            </label>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h3 className="font-semibold border-b pb-2 mb-3">
              🏙️ 物件価格 (万円)
            </h3>
            <label className="flex justify-between items-center mb-2 text-sm">
              分譲(都会):{" "}
              <input
                type="number"
                name="urbanPrice"
                value={params.urbanPrice}
                onChange={handleChange}
                className="border rounded p-1 w-24 text-right"
              />
            </label>
            <label className="flex justify-between items-center mb-2 text-sm">
              分譲(郊外):{" "}
              <input
                type="number"
                name="suburbPrice"
                value={params.suburbPrice}
                onChange={handleChange}
                className="border rounded p-1 w-24 text-right"
              />
            </label>
            <label className="flex justify-between items-center text-sm">
              戸建て:{" "}
              <input
                type="number"
                name="housePrice"
                value={params.housePrice}
                onChange={handleChange}
                className="border rounded p-1 w-24 text-right"
              />
            </label>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h3 className="font-semibold border-b pb-2 mb-3">
              📉 35年後の残存価値 (%)
            </h3>
            <label className="flex justify-between items-center mb-2 text-sm">
              分譲(都会):{" "}
              <input
                type="number"
                name="urbanRes"
                value={params.urbanRes}
                onChange={handleChange}
                className="border rounded p-1 w-24 text-right"
              />
            </label>
            <label className="flex justify-between items-center mb-2 text-sm">
              分譲(郊外):{" "}
              <input
                type="number"
                name="suburbRes"
                value={params.suburbRes}
                onChange={handleChange}
                className="border rounded p-1 w-24 text-right"
              />
            </label>
            <label className="flex justify-between items-center text-sm">
              戸建て(土地):{" "}
              <input
                type="number"
                name="houseRes"
                value={params.houseRes}
                onChange={handleChange}
                className="border rounded p-1 w-24 text-right"
              />
            </label>
          </div>
        </div>

        {/* グラフ描画エリア */}
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" fontSize={12} stroke="#64748b" />
              <YAxis
                tickFormatter={(val) => `${Math.round(val / 10000)}万円`}
                fontSize={12}
                stroke="#64748b"
                width={80}
              />
              <Tooltip
                formatter={(value: any) => [
                  `${Math.round(value / 10000).toLocaleString()}万円`,
                  "純資産",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="rent"
                name="賃貸"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="urban"
                name="分譲(都会)"
                stroke="#ef4444"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="suburb"
                name="分譲(郊外)"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="house"
                name="戸建て"
                stroke="#eab308"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
