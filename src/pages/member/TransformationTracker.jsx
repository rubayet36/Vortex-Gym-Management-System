import React, { useState } from "react";
import {
  Camera,
  Plus,
  TrendingDown,
  LineChart as ChartIcon,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const mockLogs = [
  { date: "Jan 1", weight: 85, fat: 22 },
  { date: "Feb 1", weight: 83, fat: 20 },
  { date: "Mar 1", weight: 81, fat: 18 },
  { date: "Apr 1", weight: 79, fat: 16 },
  { date: "May 1", weight: 78, fat: 15 },
];

const mockPhotos = [
  {
    id: 1,
    date: "May 1, 2024",
    url: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=200",
  },
  {
    id: 2,
    date: "Jan 1, 2024",
    url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200",
  },
];

const TransformationTracker = () => {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Progress Tracker
        </h1>
        <p className="text-text-muted mt-1">
          Log your weight, measurements, and progress photos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 border-border/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-text-muted">
                Current Weight
              </p>
              <div className="flex items-end gap-2 mt-2">
                <h4 className="text-3xl font-bold text-white">78.0</h4>
                <span className="text-text-muted mb-1 text-sm font-medium">
                  kg
                </span>
              </div>
            </div>
            <div className="p-2 bg-accent/10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-accent" />
            </div>
          </div>
          <p className="text-sm text-accent font-medium mt-3">
            -7.0 kg since Jan 1
          </p>
        </div>
        <div className="card p-5 border-border/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-text-muted">Body Fat %</p>
              <div className="flex items-end gap-2 mt-2">
                <h4 className="text-3xl font-bold text-white">15</h4>
                <span className="text-text-muted mb-1 text-sm font-medium">
                  %
                </span>
              </div>
            </div>
            <div className="p-2 bg-secondary/10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <p className="text-sm text-secondary font-medium mt-3">
            -7% since Jan 1
          </p>
        </div>
      </div>

      <div className="card border-border/50 p-6 h-72" style={{ minWidth: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-primary" />
            Weight Trend
          </h3>
        </div>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart
            data={mockLogs}
            margin={{ top: 5, right: 10, bottom: 20, left: -20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2d334d"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="#a0aabf"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#a0aabf"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1d2d",
                borderColor: "#2d334d",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#ff4d4d"
              strokeWidth={3}
              dot={{ fill: "#ff4d4d", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card border-border/50">
        <div className="p-5 border-b border-border/50 flex justify-between items-center">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-text-muted" />
            Progress Gallery
          </h3>
          <button className="btn-secondary px-3 py-1.5 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Photo
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          {mockPhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-[3/4] rounded-lg overflow-hidden group"
            >
              <img
                src={photo.url}
                alt="Progress"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                <p className="text-white text-xs font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-secondary" />
                  {photo.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <button className="fixed bottom-24 right-4 md:hidden w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center text-white active:scale-95 transition-transform z-50">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

export default TransformationTracker;
