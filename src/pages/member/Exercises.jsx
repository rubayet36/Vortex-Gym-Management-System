import React, { useState } from "react";
import { Search, Filter, PlayCircle, Dumbbell } from "lucide-react";

const mockExercises = [
  {
    id: 1,
    name: "Barbell Bench Press",
    group: "Chest",
    difficulty: "Intermediate",
    image:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 2,
    name: "Dumbbell Flyes",
    group: "Chest",
    difficulty: "Beginner",
    image:
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 3,
    name: "Squats",
    group: "Legs",
    difficulty: "Advanced",
    image:
      "https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 4,
    name: "Deadlift",
    group: "Back",
    difficulty: "Advanced",
    image:
      "https://images.unsplash.com/photo-1599058945522-28d584b6f4ff?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 5,
    name: "Bicep Curls",
    group: "Arms",
    difficulty: "Beginner",
    image:
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 6,
    name: "Pull Ups",
    group: "Back",
    difficulty: "Intermediate",
    image:
      "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&q=80&w=300",
  },
];

const categories = [
  "All",
  "Chest",
  "Back",
  "Legs",
  "Arms",
  "Shoulders",
  "Core",
];

const Exercises = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All"
      ? mockExercises
      : mockExercises.filter((ex) => ex.group === activeCategory);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Exercise Library
        </h1>
        <p className="text-text-muted mt-1">
          Browse 3,000+ exercises with guides and videos.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search exercises..."
            className="input-field pl-9 bg-background h-11 w-full"
          />
        </div>
        <button className="btn-secondary h-11 px-4 flex items-center justify-center gap-2 md:w-auto w-full">
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Horizontal Scroller for pills */}
      <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex items-center gap-2 ${
              activeCategory === cat
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-surfaceLight text-text-muted hover:text-white"
            }`}
          >
            {cat === "All" && <Dumbbell className="w-3 h-3" />}
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-4">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="card border-border/40 group hover:border-border cursor-pointer overflow-hidden transition-all hover:shadow-xl hover:shadow-black/20"
          >
            <div className="h-48 relative overflow-hidden bg-surfaceLight">
              <img
                src={ex.image}
                alt={ex.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <PlayCircle className="w-12 h-12 text-white/80 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
              </div>
              <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-white">
                {ex.difficulty}
              </span>
            </div>
            <div className="p-4">
              <h3 className="text-white font-bold text-lg mb-1">{ex.name}</h3>
              <p className="text-text-muted text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Target: {ex.group}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Exercises;
