"use client";

import { Calendar, MapPin, User, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";

interface ProgramSession {
  id: string;
  program_name: string;
  purok_name: string;
  session_date: string;
  location: string;
  conducted_by: string;
  is_cho_conducted?: boolean;
  total_participants: number;
  days_until: number;
  status: string;
}

interface ActiveProgram {
  id: string;
  name: string;
  purok_name: string;
  frequency: string;
  status: string;
  government_funded: boolean;
  budget_amount: number;
  session_count: number;
}

interface UpcomingProgramsData {
  upcoming_sessions: ProgramSession[];
  upcoming_count: number;
  active_programs: ActiveProgram[];
  active_count: number;
}

export function UpcomingProgramsWidget({ data, isLoading }: { data?: UpcomingProgramsData; isLoading: boolean }) {
  if (isLoading) {
    return (
    <div className="admin-glass-panel p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Upcoming Program Activities
          </h2>
        </div>
        <div className="flex items-center justify-center h-40">
          <p className="text-xs text-slate-400 font-semibold">Loading programs...</p>
        </div>
      </div>
    );
  }

  if (!data || (data.upcoming_count === 0 && data.active_count === 0)) {
    return (
    <div className="admin-glass-panel p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Upcoming Program Activities
          </h2>
        </div>
        <div className="flex items-center justify-center h-40">
          <p className="text-xs text-slate-400 font-semibold">No upcoming programs scheduled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-glass-panel p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-600" />
          Upcoming Program Activities
        </h2>
        <Link href="/nutrition-programs" className="text-xs font-bold text-indigo-650 hover:underline">
          View All Programs
        </Link>
      </div>

      {/* Upcoming Sessions */}
      {data.upcoming_count > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-500" />
            Next 30 Days ({data.upcoming_count} sessions)
          </h3>
          <div className="space-y-3">
            {data.upcoming_sessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900">{session.program_name}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold">{session.purok_name}</span>
                      {session.is_cho_conducted && (
                        <span className="ml-auto inline-block px-2 py-0.5 bg-green-100 border border-green-300 text-green-700 text-[9px] font-bold rounded-full">
                          CHO Conducted
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-indigo-600 text-white text-xs font-black px-3 py-1.5 rounded-full">
                    {session.days_until === 0 ? "Today" : `${session.days_until}d`}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-blue-200/50">
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-medium">{session.conducted_by}</span>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {session.total_participants > 0 ? `${session.total_participants} participants` : session.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {data.upcoming_count > 3 && (
            <Link
              href="/nutrition-programs"
              className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline inline-flex items-center gap-1"
            >
              View all {data.upcoming_count} sessions →
            </Link>
          )}
        </div>
      )}

      {/* Active Programs */}
      {data.active_count > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            Active Programs ({data.active_count})
          </h3>
          <div className="grid gap-2.5">
            {data.active_programs.slice(0, 3).map((program) => (
              <div
                key={program.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 transition-all"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-800">{program.name}</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {program.purok_name} • {program.frequency}
                    </p>
                  </div>
                  {program.government_funded && (
                    <span className="bg-green-50 border border-green-200 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                      FUNDED
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-200">
                  <span className="font-medium">{program.session_count} sessions</span>
                  {program.budget_amount > 0 && (
                    <span className="font-semibold">₱{program.budget_amount.toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
