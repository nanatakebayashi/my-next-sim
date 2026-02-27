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
    income: 500000,
    livingCost: 150000,
    yieldRate: 5, // 収入と生活費のパラメータに変更
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

  const { chartData, summary, cashFlow } = useMemo(() => {
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

    const propTaxMonthly = params.propTax / 12;

    // 初年度の月額キャッシュフロー（収入 - 生活費 - 住居費 = 投資額）
    const initialUrbanCost = urbanLoan + params.urbanMaint + propTaxMonthly;
    const initialSuburbCost = suburbLoan + params.suburbMaint + propTaxMonthly;
    const initialHouseCost = houseLoan + params.houseMaint + propTaxMonthly;

    const cf = {
      rent: {
        cost: params.rentCost,
        living: params.livingCost,
        invest: Math.max(
          0,
          params.income - params.livingCost - params.rentCost,
        ),
      },
      urban: {
        cost: initialUrbanCost,
        living: params.livingCost,
        invest: Math.max(
          0,
          params.income - params.livingCost - initialUrbanCost,
        ),
      },
      suburb: {
        cost: initialSuburbCost,
        living: params.livingCost,
        invest: Math.max(
          0,
          params.income - params.livingCost - initialSuburbCost,
        ),
      },
      house: {
        cost: initialHouseCost,
        living: params.livingCost,
        invest: Math.max(
          0,
          params.income - params.livingCost - initialHouseCost,
        ),
      },
    };

    let investBalances = {
      rent: -params.rentInitial,
      urban: -(urbanP * (params.initialCostRate / 100)),
      suburb: -(suburbP * (params.initialCostRate / 100)),
      house: -(houseP * (params.initialCostRate / 100)),
    };

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

          const urbanCost =
            urbanLoan + params.urbanMaint + stepUpMaint + propTaxMonthly;
          const suburbCost =
            suburbLoan + params.suburbMaint + stepUpMaint + propTaxMonthly;
          const houseCost = houseLoan + params.houseMaint + propTaxMonthly;

          totalCosts.rent += rentMonthlyCost;
          totalCosts.urban += urbanCost;
          totalCosts.suburb += suburbCost;
          totalCosts.house += houseCost;

          // 投資額 = 収入 - 生活費 - 住居費 (マイナスになれば投資ゼロ)
          investBalances.rent += Math.max(
            0,
            params.income - params.livingCost - rentMonthlyCost,
          );
          investBalances.urban += Math.max(
            0,
            params.income - params.livingCost - urbanCost,
          );
          investBalances.suburb += Math.max(
            0,
            params.income - params.livingCost - suburbCost,
          );
          investBalances.house += Math.max(
            0,
            params.income - params.livingCost - houseCost,
          );

          Object.keys(investBalances).forEach((key) => {
            const k = key as keyof typeof investBalances;
            if (investBalances[k] > 0)
              investBalances[k] *= 1 + yieldRateMonthly;
          });
        }

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
        diffUrban: netWorth.urban - netWorth.rent,
        diffSuburb: netWorth.suburb - netWorth.rent,
        diffHouse: netWorth.house - netWorth.rent,
      });
    }

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

    return { chartData: data, summary: summaryData, cashFlow: cf };
  }, [params]);

  const colors = {
    rent: "#6366f1", // Indigo
    urban: "#334155", // Slate
    suburb: "#0d9488", // Teal
    house: "#d97706", // Amber
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 text-slate-800 font-sans selection:bg-indigo-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Purchase vs. Rent Financial Analyzer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            不動産購入と賃貸における35年間の純資産推移・損益分岐点シミュレーション
          </p>
        </div>

        {/* Input Parameters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
            Simulation Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Income & Lifestyle
              </h3>
              <div className="flex justify-between items-center text-sm">
                <span>月額総収入(手取り)</span>
                <input
                  type="number"
                  name="income"
                  value={params.income}
                  onChange={handleChange}
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-24 py-1"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>生活費(住居費以外)</span>
                <input
                  type="number"
                  name="livingCost"
                  value={params.livingCost}
                  onChange={handleChange}
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-24 py-1"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>投資利回り(年利%)</span>
                <input
                  type="number"
                  name="yieldRate"
                  value={params.yieldRate}
                  step="0.1"
                  onChange={handleChange}
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-16 py-1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Rent Settings
              </h3>
              <div className="flex justify-between items-center text-sm">
                <span>月額家賃 (円)</span>
                <input
                  type="number"
                  name="rentCost"
                  value={params.rentCost}
                  onChange={handleChange}
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-24 py-1"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>初期費用 (円)</span>
                <input
                  type="number"
                  name="rentInitial"
                  value={params.rentInitial}
                  onChange={handleChange}
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-24 py-1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Mortgage & Taxes
              </h3>
              <div className="flex justify-between items-center text-sm">
                <span>金利 (%)</span>
                <input
                  type="number"
                  name="loanRate"
                  value={params.loanRate}
                  step="0.1"
                  onChange={handleChange}
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-16 py-1"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>固定資産税 (年額)</span>
                <input
                  type="number"
                  name="propTax"
                  value={params.propTax}
                  onChange={handleChange}
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-24 py-1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Property Values
              </h3>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-700">都会分譲</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    name="urbanPrice"
                    value={params.urbanPrice}
                    onChange={handleChange}
                    className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-14 py-1"
                  />
                  万
                  <input
                    type="number"
                    name="urbanRes"
                    value={params.urbanRes}
                    onChange={handleChange}
                    className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-10 py-1"
                  />
                  %
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-700">郊外分譲</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    name="suburbPrice"
                    value={params.suburbPrice}
                    onChange={handleChange}
                    className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-14 py-1"
                  />
                  万
                  <input
                    type="number"
                    name="suburbRes"
                    value={params.suburbRes}
                    onChange={handleChange}
                    className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-10 py-1"
                  />
                  %
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-700">戸建て</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    name="housePrice"
                    value={params.housePrice}
                    onChange={handleChange}
                    className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-14 py-1"
                  />
                  万
                  <input
                    type="number"
                    name="houseRes"
                    value={params.houseRes}
                    onChange={handleChange}
                    className="border-b border-slate-300 focus:border-indigo-500 outline-none text-right w-10 py-1"
                  />
                  %
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Flow Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-end mb-4 border-b pb-2">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              Initial Monthly Cash Flow
            </h2>
            <span className="text-xs text-slate-500">
              収入 － (生活費 ＋ 住居費) ＝ 投資額
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "賃貸",
                key: "rent",
                data: cashFlow.rent,
                color: colors.rent,
              },
              {
                label: "分譲 (都会)",
                key: "urban",
                data: cashFlow.urban,
                color: colors.urban,
              },
              {
                label: "分譲 (郊外)",
                key: "suburb",
                data: cashFlow.suburb,
                color: colors.suburb,
              },
              {
                label: "戸建て",
                key: "house",
                data: cashFlow.house,
                color: colors.house,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="p-4 rounded-lg bg-slate-50 border border-slate-100 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <div className="text-xs font-semibold text-slate-700 mb-3 ml-2">
                  {item.label}
                </div>
                <div className="space-y-1 ml-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">住居費:</span>
                    <span className="text-slate-700">
                      {Math.round(item.data.cost).toLocaleString()} 円
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">生活費:</span>
                    <span className="text-slate-700">
                      {Math.round(item.data.living).toLocaleString()} 円
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 mt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-800">
                      投資額:
                    </span>
                    <span className="font-bold text-indigo-600">
                      {Math.round(item.data.invest).toLocaleString()} 円
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
            <h3 className="text-sm font-semibold text-slate-800 tracking-wider mb-4">
              Net Worth Projection (純資産推移)
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="year"
                  fontSize={11}
                  stroke="#94a3b8"
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={(val) => `${Math.round(val / 10000)}M`}
                  fontSize={11}
                  stroke="#94a3b8"
                  width={40}
                />
                <Tooltip
                  formatter={(val: any) => [
                    `${Math.round(Number(val) / 10000).toLocaleString()}万円`,
                    "純資産",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="rent"
                  name="賃貸"
                  stroke={colors.rent}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="urban"
                  name="分譲(都会)"
                  stroke={colors.urban}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="suburb"
                  name="分譲(郊外)"
                  stroke={colors.suburb}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="house"
                  name="戸建て"
                  stroke={colors.house}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
            <h3 className="text-sm font-semibold text-slate-800 tracking-wider mb-4">
              Breakeven Analysis (賃貸との差額)
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="year"
                  fontSize={11}
                  stroke="#94a3b8"
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={(val) => `${Math.round(val / 10000)}M`}
                  fontSize={11}
                  stroke="#94a3b8"
                  width={40}
                />
                <Tooltip
                  formatter={(val: any) => [
                    `${Math.round(Number(val) / 10000).toLocaleString()}万円`,
                    "差額",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                <ReferenceLine
                  y={0}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  label={{
                    position: "insideTopLeft",
                    value: "Base (Rent)",
                    fill: "#94a3b8",
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="diffUrban"
                  name="都会 vs 賃貸"
                  stroke={colors.urban}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="diffSuburb"
                  name="郊外 vs 賃貸"
                  stroke={colors.suburb}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="diffHouse"
                  name="戸建て vs 賃貸"
                  stroke={colors.house}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 35-Year Summary Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
            35-Year Financial Summary
          </h2>
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-medium">項目</th>
                <th
                  className="py-3 px-4 font-medium"
                  style={{ color: colors.rent }}
                >
                  賃貸
                </th>
                <th
                  className="py-3 px-4 font-medium"
                  style={{ color: colors.urban }}
                >
                  分譲 (都会)
                </th>
                <th
                  className="py-3 px-4 font-medium"
                  style={{ color: colors.suburb }}
                >
                  分譲 (郊外)
                </th>
                <th
                  className="py-3 px-4 font-medium"
                  style={{ color: colors.house }}
                >
                  戸建て
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-slate-500">
                  生涯住居費 (支払総額)
                </td>
                <td className="py-3 px-4">
                  {Math.round(summary.rent.cost / 10000).toLocaleString()} 万円
                </td>
                <td className="py-3 px-4">
                  {Math.round(summary.urban.cost / 10000).toLocaleString()} 万円
                </td>
                <td className="py-3 px-4">
                  {Math.round(summary.suburb.cost / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="py-3 px-4">
                  {Math.round(summary.house.cost / 10000).toLocaleString()} 万円
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-slate-500">投資残高 (現金)</td>
                <td className="py-3 px-4">
                  {Math.round(summary.rent.invest / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="py-3 px-4">
                  {Math.round(summary.urban.invest / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="py-3 px-4">
                  {Math.round(summary.suburb.invest / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="py-3 px-4">
                  {Math.round(summary.house.invest / 10000).toLocaleString()}{" "}
                  万円
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-slate-500">最終不動産価値</td>
                <td className="py-3 px-4 text-slate-300">-</td>
                <td className="py-3 px-4">
                  {Math.round(summary.urban.prop / 10000).toLocaleString()} 万円
                </td>
                <td className="py-3 px-4">
                  {Math.round(summary.suburb.prop / 10000).toLocaleString()}{" "}
                  万円
                </td>
                <td className="py-3 px-4">
                  {Math.round(summary.house.prop / 10000).toLocaleString()} 万円
                </td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="py-4 px-4 text-slate-900">最終純資産</td>
                <td className="py-4 px-4" style={{ color: colors.rent }}>
                  {Math.round(summary.rent.net / 10000).toLocaleString()} 万円
                </td>
                <td className="py-4 px-4" style={{ color: colors.urban }}>
                  {Math.round(summary.urban.net / 10000).toLocaleString()} 万円
                </td>
                <td className="py-4 px-4" style={{ color: colors.suburb }}>
                  {Math.round(summary.suburb.net / 10000).toLocaleString()} 万円
                </td>
                <td className="py-4 px-4" style={{ color: colors.house }}>
                  {Math.round(summary.house.net / 10000).toLocaleString()} 万円
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
