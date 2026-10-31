import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CirclePlay,
  Clock3,
  Menu,
  Play,
  Search,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import ProtectedVideo from "../components/ProtectedVideo";
import { fetchCourseById } from "../api/courses";
import { useUser } from "../context/UserContext";

export default function Watch() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("v");
  const { hasCourse, isAuthenticated } = useUser();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mobileLessonsOpen, setMobileLessonsOpen] = useState(false);

  const videos = course?.videos || [];
  const selectedVideo =
    (videoId && videos.find((v) => v.id === videoId)) || videos[0] || null;
  const title = selectedVideo?.title || course?.title || "Course lesson";
  const secureVideoId = selectedVideo?.videoId || "";

  const selectedIndex = selectedVideo
    ? videos.findIndex((video) => video.id === selectedVideo.id)
    : -1;

  const nextVideo =
    selectedIndex >= 0 && selectedIndex < videos.length - 1
      ? videos[selectedIndex + 1]
      : null;

  const playNextLesson = () => {
    if (!nextVideo) return;

    window.location.assign(
      `/watch/${course.id}?v=${encodeURIComponent(nextVideo.id)}`,
    );
  };

  const visibleVideos = useMemo(
    () =>
      videos.filter((v) =>
        (v.title || "Lesson").toLowerCase().includes(search.toLowerCase()),
      ),
    [videos, search],
  );
  const moduleGroups = useMemo(() => {
    const groups = new Map();
    visibleVideos.forEach((video, visibleIndex) => {
      const rawModule =
        video.moduleName ||
        video.moduleTitle ||
        (typeof video.module === "string"
          ? video.module
          : video.module?.name) ||
        video.section ||
        "Module 1";
      const moduleName = String(rawModule).trim() || "Module 1";
      if (!groups.has(moduleName)) groups.set(moduleName, []);
      groups.get(moduleName).push({ video, visibleIndex });
    });
    return Array.from(groups.entries()).map(([name, lessons], index) => ({
      name,
      lessons: lessons
        .map((item) => ({
          ...item,
          originalIndex: videos.findIndex((v) => v.id === item.video.id),
        }))
        .sort((a, b) => {
          const aOrder = Number(
            a.video.lessonOrder ?? a.video.order ?? a.video.sequence,
          );
          const bOrder = Number(
            b.video.lessonOrder ?? b.video.order ?? b.video.sequence,
          );
          const aValid =
            Number.isFinite(aOrder) &&
            (a.video.lessonOrder != null ||
              a.video.order != null ||
              a.video.sequence != null);
          const bValid =
            Number.isFinite(bOrder) &&
            (b.video.lessonOrder != null ||
              b.video.order != null ||
              b.video.sequence != null);
          return aValid && bValid
            ? aOrder - bOrder
            : a.originalIndex - b.originalIndex;
        }),
      order: index,
    }));
  }, [visibleVideos, videos]);
  const [expandedModules, setExpandedModules] = useState({});
  useEffect(() => {
    if (selectedVideo?.id) {
      const activeGroup = moduleGroups.find((group) =>
        group.lessons.some(({ video }) => video.id === selectedVideo.id),
      );
      if (activeGroup) {
        setExpandedModules((current) => ({
          ...current,
          [activeGroup.name]: true,
        }));
      }
    }
  }, [selectedVideo?.id, moduleGroups]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchCourseById(courseId);
        if (cancelled) return;
        if (res.success) setCourse(res.data);
        else setError("Course not found");
      } catch (err) {
        if (!cancelled)
          setError(err.response?.data?.message || "Failed to load course");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!isAuthenticated)
    return (
      <Navigate to="/login" replace state={{ from: `/watch/${courseId}` }} />
    );
  if (loading)
    return (
      <div className="grid min-h-[70vh] place-items-center bg-[#f3f5f8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
          <p className="mt-4 text-sm text-slate-500">Loading your course...</p>
        </div>
      </div>
    );
  if (error || !course)
    return (
      <div className="grid min-h-[70vh] place-items-center bg-[#f3f5f8] p-5">
        <div className="max-w-md rounded-3xl bg-white p-9 text-center shadow-lg">
          <Video size={32} className="mx-auto text-amber-500" />
          <h1 className="mt-4 text-xl font-bold">Unable to load course</h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || "Course not found"}
          </p>
          <Link
            to="/dashboard"
            className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  if (!hasCourse(course.id))
    return <Navigate to={`/courses/${course.id}`} replace />;

  const lessonSidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-amber-700"
          >
            <ArrowLeft size={15} /> My courses
          </Link>
          <button
            onClick={() => setMobileLessonsOpen(false)}
            aria-label="Close lessons"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X size={17} />
          </button>
        </div>
        <div className="mt-5 flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <BookOpen size={21} />
          </div>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-sm font-extrabold leading-5 text-slate-800">
              {course.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {videos.length} lesson{videos.length === 1 ? "" : "s"} · On-demand
              course
            </p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-0 rounded-full bg-emerald-500" />
        </div>
        {/* <div className="mt-2 flex justify-between text-[11px] text-slate-400">
          <span>Course progress</span>
          <span>0%</span>
        </div> */}
        <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Search size={15} className="shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons"
            className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between px-2 py-2">
          <span className="text-[10px] font-bold tracking-[.16em] text-slate-400">
            COURSE CONTENT
          </span>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
        {moduleGroups.length ? (
          moduleGroups.map((group, groupIndex) => {
            const expanded = expandedModules[group.name] ?? groupIndex === 0;
            return (
              <div key={group.name} className="mb-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedModules((current) => ({
                      ...current,
                      [group.name]: !expanded,
                    }))
                  }
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="min-w-0 flex-1">
                    {groupIndex + 1}. {group.name}
                    <span className="ml-2 text-[10px] font-medium text-slate-400">
                      {group.lessons.length} lesson
                      {group.lessons.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <ChevronDown
                    size={15}
                    className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                {expanded && (
                  <div className="pb-1">
                    {group.lessons.map(({ video: v, originalIndex }, index) => {
                      const active = selectedVideo?.id === v.id;
                      return (
                        <Link
                          key={v.id || originalIndex}
                          to={`/watch/${course.id}?v=${v.id}`}
                          onClick={() => setMobileLessonsOpen(false)}
                          className={`group mb-1 flex items-start gap-3 rounded-xl p-3 transition ${active ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200" : "text-slate-600 hover:bg-slate-50"}`}
                        >
                          <span
                            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${active ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}`}
                          >
                            {active ? (
                              <Play size={13} fill="currentColor" />
                            ) : (
                              String(originalIndex + 1).padStart(2, "0")
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-xs font-semibold leading-5 ${active ? "text-amber-900" : "text-slate-700"}`}
                            >
                              {v.title || `Lesson ${index + 1}`}
                            </span>
                            <span className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                              <CirclePlay size={11} />
                              {v.duration || "Video lesson"}
                            </span>
                            {active && (
                              <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                Now playing
                              </span>
                            )}
                          </span>
                          {active && (
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="px-3 py-8 text-center text-xs text-slate-400">
            No lessons match your search.
          </p>
        )}
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={15} className="text-emerald-600" /> Secure course
          access
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f2f4f7] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[300px] border-r border-slate-200 shadow-[4px_0_24px_rgba(15,23,42,.03)] lg:block">
        {lessonSidebar}
      </aside>
      <AnimatePresence>
        {mobileLessonsOpen && (
          <>
            <motion.button
              aria-label="Close lesson menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileLessonsOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 w-[min(88vw,320px)] shadow-2xl lg:hidden"
            >
              {lessonSidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="min-h-screen lg:pl-[300px]">
        <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileLessonsOpen(true)}
              aria-label="Open lessons"
              className="rounded-xl border border-slate-200 p-2 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-amber-600">
                Course player
              </p>
              <h1 className="truncate text-sm font-bold sm:text-base">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 sm:flex">
              <CheckCircle2 size={14} /> Enrolled
            </span>
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Exit course
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1450px] p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">
                Continue learning
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                {course.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedVideo?.title ||
                  "Choose a lesson from the course content."}
              </p>
            </div>
            {selectedVideo && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                <Clock3 size={14} />
                {selectedVideo.duration || "Video lesson"}
              </span>
            )}
          </motion.div>
          <motion.section
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-[0_18px_55px_rgba(15,23,42,.12)] sm:rounded-3xl"
          >
            {secureVideoId ? (
              <div className="relative">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-4 sm:px-6">
                  <span className="max-w-[75%] truncate text-xs font-semibold text-white sm:text-sm">
                    {title}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5 text-[10px] font-semibold text-white/80 backdrop-blur">
                    <ShieldCheck size={12} /> Secure playback
                  </span>
                </div>
                <ProtectedVideo
                  title={title}
                  courseId={course.id}
                  videoId={selectedVideo?.id}
                  nextVideo={nextVideo}
                  onPlayNext={playNextLesson}
                />
              </div>
            ) : (
              <div className="grid min-h-[280px] place-items-center bg-slate-900 px-5 py-12 text-center text-white sm:min-h-[460px]">
                <div>
                  <Video size={34} className="mx-auto text-amber-400" />
                  <h3 className="mt-4 text-lg font-bold">No video available</h3>
                  <p className="mt-2 text-sm text-white/60">
                    This lesson does not have a video uploaded yet.
                  </p>
                </div>
              </div>
            )}
          </motion.section>
          <section className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <BookOpen size={19} />
                </span>
                <div>
                  <h3 className="font-bold">About this lesson</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Watch the lesson and use the course list on the left to move
                    through your learning material at your own pace.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:min-w-[220px]">
              <div>
                <p className="text-xs text-slate-400">Your course</p>
                <p className="mt-1 text-sm font-bold">
                  {videos.length} lessons
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
              >
                My courses <ChevronRight size={14} />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
