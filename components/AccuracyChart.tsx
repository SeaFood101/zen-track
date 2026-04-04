"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Session } from "@/lib/storage";

interface AccuracyChartProps {
  sessions: Session[];
  detailed?: boolean;
}

export default function AccuracyChart({
  sessions,
  detailed = false,
}: AccuracyChartProps) {
  const data = sessions
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => ({
      date: new Date(s.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      combined: Math.round(s.combinedAccuracy),
      eye: Math.round(s.eyeAccuracy),
      touch: Math.round(s.touchAccuracy),
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
        />
        <XAxis
          dataKey="date"
          tick={{ fill: "rgba(232,232,232,0.4)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "rgba(232,232,232,0.4)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#181a22",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            fontSize: "13px",
            color: "#e8e8e8",
          }}
        />
        <Line
          type="monotone"
          dataKey="combined"
          stroke={detailed ? "#e8e8e8" : "#5eead4"}
          strokeWidth={2}
          dot={{ r: data.length === 1 ? 4 : 2, fill: detailed ? "#e8e8e8" : "#5eead4" }}
          name="Combined"
        />
        {detailed && (
          <>
            <Line
              type="monotone"
              dataKey="eye"
              stroke="#5eead4"
              strokeWidth={2}
              dot={{ r: data.length === 1 ? 4 : 2, fill: "#5eead4" }}
              name="Eye"
            />
            <Line
              type="monotone"
              dataKey="touch"
              stroke="#fca5a1"
              strokeWidth={2}
              dot={{ r: data.length === 1 ? 4 : 2, fill: "#fca5a1" }}
              name="Touch"
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
