import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute, RootRedirect } from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

// Auth Pages
import Login from "./pages/auth/Login";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import MembersManager from "./pages/admin/MembersManager";
import POS from "./pages/admin/POS";
import Finances from "./pages/admin/Finances";
import PackageHistory from "./pages/admin/PackageHistory";

// Trainer Pages
import TrainerDashboard from "./pages/trainer/Dashboard";
import ClientRoster from "./pages/trainer/ClientRoster";
import WorkoutBuilder from "./pages/trainer/WorkoutBuilder";

// Member Pages
import MemberDashboard from "./pages/member/Dashboard";
import TransformationTracker from "./pages/member/TransformationTracker";
import Exercises from "./pages/member/Exercises";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<RootRedirect />} />

            {/* Admin Routes */}
            <Route
              element={<ProtectedRoute allowedRoles={["owner", "manager"]} />}
            >
              <Route element={<AppLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/members" element={<MembersManager />} />
                <Route path="/admin/pos" element={<POS />} />
                <Route path="/admin/finances" element={<Finances />} />
                <Route path="/admin/packages/history" element={<PackageHistory />} />
              </Route>
            </Route>

            {/* Trainer Routes */}
            <Route element={<ProtectedRoute allowedRoles={["trainer"]} />}>
              <Route element={<AppLayout />}>
                <Route path="/trainer" element={<TrainerDashboard />} />
                <Route path="/trainer/clients" element={<ClientRoster />} />
                <Route
                  path="/trainer/workout-builder"
                  element={<WorkoutBuilder />}
                />
              </Route>
            </Route>

            {/* Member Routes */}
            <Route element={<ProtectedRoute allowedRoles={["member"]} />}>
              <Route element={<AppLayout />}>
                <Route path="/member" element={<MemberDashboard />} />
                <Route
                  path="/member/tracker"
                  element={<TransformationTracker />}
                />
                <Route path="/member/exercises" element={<Exercises />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
