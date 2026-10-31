import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  CalendarClock,
  Clock3,
  Video,
  Radio,
  LockKeyhole,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import API from "../api/axios";

function countdown(target, now) {
  const ms = Math.max(0, new Date(target).getTime() - now);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { days, hours, minutes, seconds, ended: ms <= 0 };
}
const dateLabel = (date) =>
  new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
export default function MySessionsPanel() {
  const [sessions, setSessions] = useState([]),
    [eligible, setEligible] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now());
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get("/live-sessions");
      setSessions(data.data || []);
      setEligible(Boolean(data.eligible));
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Couldn't load live sessions. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const upcoming = useMemo(
    () =>
      sessions
        .filter((s) => new Date(s.startsAt).getTime() > now)
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [sessions, now],
  );
  const live = sessions.filter(
    (s) =>
      new Date(s.startsAt).getTime() <= now &&
      new Date(s.endsAt).getTime() >= now,
  );
  return (
    <div className="space-y-7">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#10243d] via-[#17385b] to-[#1b5262] p-6 text-white shadow-xl sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
              <Sparkles size={14} /> LIVE LEARNING
            </span>
            <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Your live classroom
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
              Join live sessions, learn directly with your mentors, and never
              miss a class.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-2xl font-black">{upcoming.length}</p>
              <p className="text-xs text-white/65">Upcoming</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-2xl font-black">{live.length}</p>
              <p className="text-xs text-white/65">Live now</p>
            </div>
          </div>
        </div>
      </motion.section>
      {!eligible && !loading && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <LockKeyhole className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-bold">Live classes are for enrolled learners</p>
            <p className="mt-1 text-sm text-amber-900/80">
              Purchase any course to unlock the ability to join live classes
              when they are in progress.
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-extrabold">Sessions & classes</h3>
          <p className="mt-1 text-sm text-slate-500">
            All times are shown in your local timezone.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <CalendarClock size={34} className="mx-auto text-slate-400" />
          <h4 className="mt-4 font-bold">No live classes scheduled yet</h4>
          <p className="mt-2 text-sm text-slate-500">
            When your admin schedules a class, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {sessions.map((s, i) => {
            const c = countdown(s.startsAt, now),
              isLive =
                new Date(s.startsAt).getTime() <= now &&
                new Date(s.endsAt).getTime() >= now;
            return (
              <motion.article
                key={s.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.06, 0.3) }}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={s.thumbnail}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  <span
                    className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${isLive ? "bg-rose-500 text-white" : "bg-white/95 text-slate-700"}`}
                  >
                    {isLive ? (
                      <>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />{" "}
                        LIVE NOW
                      </>
                    ) : (
                      <>
                        <CalendarClock size={13} /> UPCOMING
                      </>
                    )}
                  </span>
                </div>
                <div className="p-5">
                  <h4 className="text-lg font-extrabold text-slate-900">
                    {s.title}
                  </h4>
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-500">
                    {s.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock size={14} />
                      {dateLabel(s.startsAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={14} />
                      Ends{" "}
                      {new Date(s.endsAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {!isLive && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">
                        Starts in
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          [c.days, "Days"],
                          [c.hours, "Hours"],
                          [c.minutes, "Mins"],
                          [c.seconds, "Secs"],
                        ].map(([v, label]) => (
                          <div
                            key={label}
                            className="rounded-lg border border-slate-100 bg-white py-2 text-center"
                          >
                            <p className="text-lg font-black tabular-nums text-slate-800">
                              {String(v).padStart(2, "0")}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-5">
                    {isLive && eligible && s.meetingUrl ? (
                      <a
                        href={s.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <Video size={17} /> Join Google Meet{" "}
                        <ExternalLink size={14} />
                      </a>
                    ) : isLive && !eligible ? (
                      <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
                        <LockKeyhole size={16} /> Course purchase required
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">
                        <CalendarClock size={16} /> Join button unlocks when
                        class is live
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
