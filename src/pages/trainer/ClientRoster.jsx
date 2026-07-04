import React from "react";
import {
  Search,
  User,
  Activity,
  Dumbbell,
  Calendar,
  ChevronRight,
} from "lucide-react";

const mockClients = [
  {
    id: 1,
    name: "David Lee",
    goal: "Muscle Gain",
    attendance: "85%",
    nextSession: "Tomorrow, 5:00 PM",
    image: "https://i.pravatar.cc/150?u=10",
  },
  {
    id: 2,
    name: "Emma Watson",
    goal: "Weight Loss",
    attendance: "60%",
    nextSession: "Today, 6:30 PM",
    image: "https://i.pravatar.cc/150?u=11",
  },
  {
    id: 3,
    name: "Chris Evans",
    goal: "Strength",
    attendance: "95%",
    nextSession: "Friday, 7:00 AM",
    image: "https://i.pravatar.cc/150?u=12",
  },
];

const ClientRoster = () => {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            My Clients
          </h1>
          <p className="text-text-muted mt-1">
            Manage your assigned training roster.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search clients..."
            className="input-field pl-9 w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockClients.map((client) => (
          <div
            key={client.id}
            className="card p-5 group hover:border-secondary transition-all cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <img
                src={client.image}
                alt={client.name}
                className="w-14 h-14 rounded-full border-2 border-border group-hover:border-secondary transition-all"
              />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{client.name}</h3>
                <p className="text-sm text-secondary font-medium">
                  {client.goal}
                </p>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Activity className="w-4 h-4" />
                    <span>
                      Attendance:{" "}
                      <span className="text-white font-medium">
                        {client.attendance}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Calendar className="w-4 h-4" />
                    <span className="truncate">{client.nextSession}</span>
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-text-muted group-hover:bg-secondary group-hover:text-white transition-all">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
              <button className="bg-surfaceLight hover:bg-border text-white text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                <Dumbbell className="w-3 h-3" />
                View Workout
              </button>
              <button className="bg-surfaceLight hover:bg-border text-white text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                <User className="w-3 h-3" />
                View Diet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientRoster;
