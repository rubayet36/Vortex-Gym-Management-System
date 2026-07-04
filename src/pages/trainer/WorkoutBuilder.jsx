import React, { useState } from "react";
import {
  Dumbbell,
  Plus,
  Trash2,
  Save,
  MoveVertical,
  Beaker,
} from "lucide-react";

const WorkoutBuilder = () => {
  const [activeTab, setActiveTab] = useState("workout"); // 'workout' or 'diet'
  const [exercises, setExercises] = useState([
    { id: 1, name: "Barbell Bench Press", sets: 4, reps: "8-10", rest: "90s" },
    {
      id: 2,
      name: "Incline Dumbbell Press",
      sets: 3,
      reps: "10-12",
      rest: "60s",
    },
  ]);

  const [meals, setMeals] = useState([
    {
      id: 1,
      meal: "Breakfast",
      foods: "4 Whole Eggs, 2 slices Toast, 1 Banana",
      calories: 550,
    },
    {
      id: 2,
      meal: "Lunch",
      foods: "200g Chicken Breast, 1 cup Rice, Broccoli",
      calories: 600,
    },
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Plan Builder
          </h1>
          <p className="text-text-muted mt-1">
            Design custom workout routines and diet charts.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Plan
        </button>
      </div>

      <div className="flex space-x-1 bg-surface border border-border p-1 rounded-xl max-w-sm">
        <button
          onClick={() => setActiveTab("workout")}
          className={`flex-1 py-2 flex justify-center items-center gap-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "workout" ? "bg-secondary text-white shadow" : "text-text-muted hover:text-white"}`}
        >
          <Dumbbell className="w-4 h-4" />
          Workout Routine
        </button>
        <button
          onClick={() => setActiveTab("diet")}
          className={`flex-1 py-2 flex justify-center items-center gap-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "diet" ? "bg-accent text-white shadow" : "text-text-muted hover:text-white"}`}
        >
          <Beaker className="w-4 h-4" />
          Diet Plan
        </button>
      </div>

      <div className="card border-border/50">
        <div className="p-5 border-b border-border/50 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="label">Plan Name</label>
            <input
              type="text"
              className="input-field"
              defaultValue={
                activeTab === "workout"
                  ? "Push Day - Hypertrophy"
                  : "Bulking Diet 3000kcal"
              }
            />
          </div>
          <div className="flex-1">
            <label className="label">Assign To Client</label>
            <select className="input-field">
              <option>David Lee</option>
              <option>Emma Watson</option>
              <option>Chris Evans</option>
            </select>
          </div>
        </div>

        <div className="p-5">
          {activeTab === "workout" ? (
            <div className="space-y-4">
              {exercises.map((ex, i) => (
                <div
                  key={ex.id}
                  className="flex flex-col md:flex-row gap-3 items-center bg-surfaceLight p-3 rounded-xl border border-border/50 group"
                >
                  <MoveVertical className="w-5 h-5 text-text-muted cursor-move" />
                  <div className="flex-1 w-full">
                    <span className="text-xs text-secondary font-bold mb-1 block">
                      Exercise {i + 1}
                    </span>
                    <p className="text-white font-medium">{ex.name}</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input
                      type="text"
                      className="input-field w-full md:w-20 text-center"
                      defaultValue={ex.sets}
                      title="Sets"
                    />
                    <input
                      type="text"
                      className="input-field w-full md:w-24 text-center"
                      defaultValue={ex.reps}
                      title="Reps"
                    />
                    <input
                      type="text"
                      className="input-field w-full md:w-20 text-center"
                      defaultValue={ex.rest}
                      title="Rest Time"
                    />
                  </div>
                  <button className="p-2 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button className="w-full py-4 border-2 border-dashed border-border/50 rounded-xl text-text-muted hover:text-white hover:border-secondary transition-all flex justify-center items-center gap-2 font-medium">
                <Plus className="w-5 h-5" /> Add Exercise from Library (3,000+
                available)
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex flex-col md:flex-row gap-3 items-start bg-surfaceLight p-4 rounded-xl border border-border/50"
                >
                  <div className="w-full md:w-32">
                    <input
                      type="text"
                      className="input-field text-sm font-bold text-accent"
                      defaultValue={meal.meal}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <textarea
                      className="input-field min-h-[60px]"
                      defaultValue={meal.foods}
                    />
                  </div>
                  <div className="w-full md:w-24">
                    <input
                      type="number"
                      className="input-field text-center"
                      defaultValue={meal.calories}
                      title="Calories"
                    />
                  </div>
                  <button className="p-2 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-colors mt-1">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button className="w-full py-4 border-2 border-dashed border-border/50 rounded-xl text-text-muted hover:text-white hover:border-accent transition-all flex justify-center items-center gap-2 font-medium">
                <Plus className="w-5 h-5" /> Add Meal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutBuilder;
