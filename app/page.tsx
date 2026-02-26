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
  ReferenceLine,
} from "recharts";

export default function Home() {
  const [params, setParams] = useState({
    budget: 300000,
    yieldRate: 5,
    rentCost: 120000,
    rentInitial: 500000,
    rentRenewal: 1,
    loanRate: 0.5,
    loanYears: 35,
    initialCostRate: 7,
    propTax: 120000,
    deductionYears: 13,
    deductionRate: 0.7,
    sellCostRate: 3,
    urbanPrice: 6000,
    urbanRes: 80,
    urbanMaint: 25000,
    suburbPrice: 3500,
    suburbRes: 40,
    suburbMaint: 20000,
    housePrice: 4000,
    houseRes: 50,
    houseMaint: 10000,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams({ ...params, [e.target.name]: Number(e.target.value) });
  };

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
    passedMonths: number,
  ) => {
    if (annualRate === 0)
      return principal * (1 - passedMonths / (totalYears * 12));
    const r = annualRate / 100 / 12;
    const n = totalYears * 12;
    return (
      (principal * (Math.pow(1 + r, n) - Math.pow(1 + r, passedMonths))) /
      (Math.pow(1 + r, n) - 1)
    );
  };

  // データとサマリーの計算
  const { chartData, summary } = useMemo(() => {
    const yieldRateMonthly = params.yieldRate / 100 / 12;
    const urbanP = params.urbanPrice * 10000;
    const suburbP = params.suburbPrice * 10000;
    const houseP = params.housePrice * 10000;

    const urbanLoan = calcMonthlyMortgage(
      urbanP,
      params.loanRate,
      params.loanYears,
    );
    const suburbLoan = calcMonthlyMortgage(
      suburbP,
      params.loanRate,
      params.loanYears,
    );
    const houseLoan = calcMonthlyMortgage(
      houseP,
      params.loanRate,
      params.loanYears,
    );

    // 投資残高の初期化
    let investBalances = {
      rent: -params.rentInitial,
      urban: -(urbanP * (params.initialCostRate / 100)),
      suburb: -(suburbP * (params.initialCostRate / 100)),
      house: -(houseP * (params.initialCostRate / 100)),
    };

    // 生涯住居費（コスト）の初期化
    let totalCosts = {
      rent: params.rentInitial,
      urban: urbanP * (params.initialCostRate / 100),
      suburb: suburbP * (params.initialCostRate / 100),
      house: houseP * (params.initialCostRate / 100),
    };

    const data = [];

    for (let y = 0; y <= 35; y++) {
      if (y > 0) {
        for (let m = 1; m <= 12; m++) {
          const isRenewal = y % 2 === 0 && m === 1;
          const rentMonthlyCost =
            params.rentCost +
            (isRenewal ? params.rentCost * params.rentRenewal : 0);
          const stepUpMaint = y > 20 ? 20000 : y > 10 ? 10000 : 0;
          const propTaxMonthly = params.propTax / 12;

          const urbanCost =
            urbanLoan + params.urbanMaint + stepUpMaint + propTaxMonthly;
          const suburbCost =
            suburbLoan + params.suburbMaint + stepUpMaint + propTaxMonthly;
          const houseCost = houseLoan + params.houseMaint + propTaxMonthly;

          // コストの累積
          totalCosts.rent += rentMonthlyCost;
          totalCosts.urban += urbanCost;
          totalCosts.suburb += suburbCost;
          totalCosts.house += houseCost;

          // 投資額の加算と複利計算
          investBalances.rent += params.budget - rentMonthlyCost;
          investBalances.urban += params.budget - urbanCost;
          investBalances.suburb += params.budget - suburbCost;
          investBalances.house += params.budget - houseCost;

          Object.keys(investBalances).forEach((key) => {
            const k = key as keyof typeof investBalances;
            if (investBalances[k] > 0)
              investBalances[k] *= 1 + yieldRateMonthly;
          });
        }

        // ローン控除
        if (y <= params.deductionYears) {
          investBalances.urban +=
            calcRemainingLoan(
              urbanP,
              params.loanRate,
              params.loanYears,
              y * 12,
            ) *
            (params.deductionRate / 100);
          investBalances.suburb +=
            calcRemainingLoan(
              suburbP,
              params.loanRate,
              params.loanYears,
              y * 12,
            ) *
            (params.deductionRate / 100);
          investBalances.house +=
            calcRemainingLoan(
              houseP,
              params.loanRate,
              params.loanYears,
              y * 12,
            ) *
            (params.deductionRate / 100);
        }
      }

      const currentMonth = y * 12;
      const urbanPropValue =
        urbanP * (1 - (1 - params.urbanRes / 100) * (y / params.loanYears));
      const suburbPropValue =
        suburbP * (1 - (1 - params.suburbRes / 100) * (y / params.loanYears));
      const housePropValue =
        houseP * (1 - (1 - params.houseRes / 100) * (y / params.loanYears));

      const urbanLoanRem = calcRemainingLoan(
        urbanP,
        params.loanRate,
        params.loanYears,
        currentMonth,
      );
      const suburbLoanRem = calcRemainingLoan(
        suburbP,
        params.loanRate,
        params.loanYears,
        currentMonth,
      );
      const houseLoanRem = calcRemainingLoan(
        houseP,
        params.loanRate,
        params.loanYears,
        currentMonth,
      );

      const calcSellCost = (val: number) =>
        val > 0 ? val * (params.sellCostRate / 100) + 60000 : 0;

      const netWorth = {
        rent: investBalances.rent,
        urban:
          investBalances.urban +
          urbanPropValue -
          urbanLoanRem -
          calcSellCost(urbanPropValue),
        suburb:
          investBalances.suburb +
          suburbPropValue -
          suburbLoanRem -
          calcSellCost(suburbPropValue),
        house:
          investBalances.house +
          housePropValue -
          houseLoanRem -
          calcSellCost(housePropValue),
      };

      data.push({
        year: `${y}年`,
        ...netWorth,
        // 賃貸との差額（損益分岐点用）
        diffUrban: netWorth.urban - netWorth.rent,
        diffSuburb: netWorth.suburb - netWorth.rent,
        diffHouse: netWorth.house - netWorth.rent,
      });
    }

    // 35年後の最終サマリーデータ
    const finalData = data[35];
    const summaryData = {
      rent: {
        cost: totalCosts.rent,
        invest: investBalances.rent,
        prop: 0,
        net: finalData.rent,
      },
      urban: {
        cost: totalCosts.urban,
        invest: investBalances.urban,
        prop: urbanP * (params.urbanRes / 100),
        net: finalData.urban,
      },
      suburb: {
        cost: totalCosts.suburb,
        invest: investBalances.suburb,
        prop: suburbP * (params.suburbRes / 100),
        net: finalData.suburb,
      },
      house: {
        cost: totalCosts.house,
        invest: investBalances.house,
        prop: houseP * (params.houseRes / 100),
        net: finalData.house,
      },
    };

    return { chartData: data, summary: summaryData };
  }, [params]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー＆入力エリア */}
        <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2 text-slate-900">
            🏢 購入 vs 賃貸 徹底シミュレーター
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            数値を変更すると、純資産・損益分岐点・収支サマリーがすべてリアルタイムに更新されます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h3 className="font-bold border-b border-blue-200 pb-1 mb-2 text-blue-800 text-sm">
                📊 基本・投資
              </h3>
              <label className="flex justify-between text-xs mb-1">
                予算/月:{" "}
                <input
                  type="number"
                  name="budget"
                  value={params.budget}
                  onChange={handleChange}
                  className="border rounded w-20 text-right"
                />
              </label>
              <label className="flex justify-between text-xs">
                利回り(%):{" "}
                <input
                  type="number"
                  name="yieldRate"
                  value={params.yieldRate}
                  step="0.1"
                  onChange={handleChange}
                  className="border rounded w-20 text-right"
                />
              </label>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <h3 className="font-bold border-b border-green-200 pb-1 mb-2 text-green-800 text-sm">
                🔑 賃貸
              </h3>
              <label className="flex justify-between text-xs mb-1">
                家賃/月:{" "}
                <input
                  type="number"
                  name="rentCost"
                  value={params.rentCost}
                  onChange={handleChange}
                  className="border rounded w-20 text-right"
                />
              </label>
              <label className="flex justify-between text-xs mb-1">
                初期費用:{" "}
                <input
                  type="number"
                  name="rentInitial"
                  value={params.rentInitial}
                  onChange={handleChange}
                  className="border rounded w-20 text-right"
                />
              </label>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <h3 className="font-bold border-b border-orange-200 pb-1 mb-2 text-orange-800 text-sm">
                🏦 購入共通
              </h3>
              <label className="flex justify-between text-xs mb-1">
                金利(%):{" "}
                <input
                  type="number"
                  name="loanRate"
                  value={params.loanRate}
                  step="0.1"
                  onChange={handleChange}
                  className="border rounded w-16 text-right"
                />
              </label>
              <label className="flex justify-between text-xs mb-1">
                固定資産税/年:{" "}
                <input
                  type="number"
                  name="propTax"
                  value={params.propTax}
                  onChange={handleChange}
                  className="border rounded w-20 text-right"
                />
              </label>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <h3 className="font-bold border-b border-purple-200 pb-1 mb-2 text-purple-800 text-sm">
                🏙️ 物件価格(万円) / 残存価値
              </h3>
              <label className="flex justify-between text-xs mb-1 text-red-600 font-bold">
                都会:{" "}
                <input
                  type="number"
                  name="urbanPrice"
                  value={params.urbanPrice}
                  onChange={handleChange}
                  className="border rounded w-16 text-right font-normal text-black"
                />
                万 /{" "}
                <input
                  type="number"
                  name="urbanRes"
                  value={params.urbanRes}
                  onChange={handleChange}
                  className="border rounded w-12 text-right font-normal text-black"
                />
                %
              </label>
              <label className="flex justify-between text-xs mb-1 text-emerald-600 font-bold">
                郊外:{" "}
                <input
                  type="number"
                  name="suburbPrice"
                  value={params.suburbPrice}
                  onChange={handleChange}
                  className="border rounded w-16 text-right font-normal text-black"
                />
                万 /{" "}
                <input
                  type="number"
                  name="suburbRes"
                  value={params.suburbRes}
                  onChange={handleChange}
                  className="border rounded w-12 text-right font-normal text-black"
                />
                %
              </label>
              <label className="flex justify-between text-xs font-bold text-amber-500">
                戸建:{" "}
                <input
                  type="number"
                  name="housePrice"
                  value={params.housePrice}
                  onChange={handleChange}
                  className="border rounded w-16 text-right font-normal text-black"
                />
                万 /{" "}
                <input
                  type="number"
                  name="houseRes"
                  value={params.houseRes}
                  onChange={handleChange}
                  className="border rounded w-12 text-right font-normal text-black"
                />
                %
              </label>
            </div>
          </div>
        </div>

        {/* グラフエリア（2カラム） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. 純資産推移チャート */}
          <div className="bg-white p-4 rounded-2xl shadow border border-slate-200 h-[400px]">
            <h3 className="text-lg font-bold text-center mb-2">
              📈 純資産の推移 (35年間)
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" fontSize={12} />
                <YAxis
                  tickFormatter={(val) => `${Math.round(val / 10000)}万円`}
                  fontSize={12}
                  width={60}
                />
                <Tooltip
                  formatter={(val: any) => [
                    `${Math.round(Number(val) / 10000).toLocaleString()}万円`,
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
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="house"
                  name="戸建て"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 2. 損益分岐点チャート */}
          <div className="bg-white p-4 rounded-2xl shadow border border-slate-200 h-[400px]">
            <h3 className="text-lg font-bold text-center mb-2">
              ⚖️ 損益分岐点 (賃貸との純資産の差額)
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" fontSize={12} />
                <YAxis
                  tickFormatter={(val) => `${Math.round(val / 10000)}万円`}
                  fontSize={12}
                  width={60}
                />
                <Tooltip
                  formatter={(val: any) => [
                    `${Math.round(Number(val) / 10000).toLocaleString()}万円`,
                    "賃貸との差額",
                  ]}
                />
                <Legend />
                {/* ゼロのライン（水面） */}
                <ReferenceLine
                  y={0}
                  stroke="#000"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    position: "insideTopLeft",
                    value: "← 賃貸と同等 (損益分岐点)",
                    fill: "#64748b",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="diffUrban"
                  name="都会 vs 賃貸"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="diffSuburb"
                  name="郊外 vs 賃貸"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="diffHouse"
                  name="戸建て vs 賃貸"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. 35年間の総収支サマリー表 */}
        <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 overflow-x-auto">
          <h3 className="text-xl font-bold mb-4 text-center">
            📋 35年間の総収支サマリー
          </h3>
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b-2 border-slate-200">
              <tr>
                <th className="p-3">項目 (35年後)</th>
                <th className="p-3 text-blue-600">賃貸</th>
                <th className="p-3 text-red-600">分譲 (都会)</th>
                <th className="p-3 text-emerald-600">分譲 (郊外)</th>
                <th className="p-3 text-amber-500">戸建て</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-semibold text-slate-500">
                  🔻 生涯住居費 (支払総額)
                </td>
                <td className="p-3">
                  {Math.round(summary.rent.cost / 10000).toLocaleString()} 万円
                </td>
                <td className="p-3">
                  {Math.round(summary.urban.cost / 10000).toLocaleString()} 万円
                </td>
                <td className="p-3">
                  {Math.round(summary.suburb.cost / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="p-3">
                  {Math.round(summary.house.cost / 10000).toLocaleString()} 万円
                </td>
              </tr>
              <tr className="hover:bg-slate-50 bg-blue-50/30">
                <td className="p-3 font-semibold text-slate-500">
                  📈 投資残高 (現金)
                </td>
                <td className="p-3">
                  {Math.round(summary.rent.invest / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="p-3">
                  {Math.round(summary.urban.invest / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="p-3">
                  {Math.round(summary.suburb.invest / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="p-3">
                  {Math.round(summary.house.invest / 10000).toLocaleString()}{" "}
                  万円
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-semibold text-slate-500">
                  🏠 最終的な不動産価値
                </td>
                <td className="p-3 text-slate-400">0 万円</td>
                <td className="p-3">
                  {Math.round(summary.urban.prop / 10000).toLocaleString()} 万円
                </td>
                <td className="p-3">
                  {Math.round(summary.suburb.prop / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="p-3">
                  {Math.round(summary.house.prop / 10000).toLocaleString()} 万円
                </td>
              </tr>
              <tr className="bg-slate-800 text-white font-bold text-base">
                <td className="p-3 rounded-l-lg">🏆 最終・純資産</td>
                <td className="p-3 text-blue-300">
                  {Math.round(summary.rent.net / 10000).toLocaleString()} 万円
                </td>
                <td className="p-3 text-red-300">
                  {Math.round(summary.urban.net / 10000).toLocaleString()} 万円
                </td>
                <td className="p-3 text-emerald-300">
                  {Math.round(summary.suburb.net / 10000).toLocaleString()} 万円
                </td>
                <td className="p-3 text-amber-300 rounded-r-lg">
                  {Math.round(summary.house.net / 10000).toLocaleString()} 万円
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-3 text-right">
            ※純資産 ＝ 投資残高 ＋ 不動産価値 － (ローン残債は35年で完済と仮定)
            － 売却コスト
          </p>
        </div>
      </div>
    </div>
  );
}
