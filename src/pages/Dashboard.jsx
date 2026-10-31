import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Compass,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShoppingBag,
  Trophy,
  Users,
  X,
  PlayCircle,
  Send,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { formatPrice } from "../data/courses";
import { useUser } from "../context/UserContext";
import { fetchCourses, fetchPlatforms } from "../api/courses";
import CourseCard from "../components/CourseCard";
import SettingsPanel from "../components/SettingsPanel";
import MySessionsPanel from "../components/MySessionsPanel";
import MyAssessmentsPanel from "../components/MyAssessmentsPanel";

const navGroups = [
  {
    label: "LEARNING",
    items: [
      { label: "My Courses", icon: BookOpen, active: true },
      { label: "Explore Courses", icon: Compass, view: "explore" },
      { label: "My Sessions", icon: MessageSquare, view: "sessions" },
      { label: "Communities", icon: Users },
      { label: "My Resources", icon: GraduationCap },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Transactions", icon: CreditCard },
      { label: "Rewards", icon: Trophy },
      { label: "Settings", icon: Settings },
    ],
  },
];

export default function Dashboard() {
  const { user, purchasedCourses, refreshPurchased, logout } = useUser();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [activeView, setActiveView] = useState("my");
  const [profileUser, setProfileUser] = useState(user);

  useEffect(() => {
    setProfileUser(user);
  }, [user]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshPurchased();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshPurchased]);

  const owned = purchasedCourses || [];
  const categories = useMemo(
    () => [...new Set(owned.map((c) => c.platform).filter(Boolean))],
    [owned],
  );
  const filtered = owned.filter((course) => {
    const matchesQuery = `${course.title || ""} ${course.platform || ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesQuery && (category === "all" || course.platform === category);
  });

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0d1b30] text-white">
      <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
        <Link to="/" className="leading-none tracking-tight">
          <span className="block text-[19px] font-black">SKYBIRDS</span>
          <span className="block text-[19px] font-black">LEARNING</span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
          aria-label="Close menu"
        >
          <X size={19} />
        </button>
      </div>
      <button className="mx-3 mt-4 flex items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/10">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
          <CircleUserRound size={21} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {profileUser?.name || user?.name || "Learner"}
          </span>
          <span className="block text-xs text-white/50">Student account</span>
        </span>
        <ChevronDown size={16} className="text-white/60" />
      </button>
      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-5">
        <p className="px-3 pb-2 text-[10px] font-bold tracking-[.18em] text-white/40">
          YOUR SPACE
        </p>
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="px-3 pb-2 text-[10px] font-bold tracking-[.16em] text-white/45">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon size={17} />
                    <span className="flex-1">{item.label}</span>
                    {item.active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                    )}
                  </>
                );
                const selected = item.active
                  ? activeView === "my"
                  : item.view
                    ? activeView === item.view
                    : item.label === "Settings"
                      ? activeView === "settings"
                      : item.label === "Communities"
                        ? activeView === "communities"
                        : item.label === "My Resources"
                          ? activeView === "assessments"
                          : false;
                return item.to ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.view) setActiveView(item.view);
                      else if (item.active) setActiveView("my");
                      else if (item.label === "Settings")
                        setActiveView("settings");
                      else if (item.label === "Communities")
                        setActiveView("communities");
                      else if (item.label === "My Resources")
                        setActiveView("assessments");
                      setMobileOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition ${selected ? "bg-amber-400/15 text-amber-200 shadow-[inset_3px_0_0_#fbbf24]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f2f4f7] text-[#17243a]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[244px] lg:block">
        {sidebar}
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              aria-label="Close sidebar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 w-[270px] shadow-2xl lg:hidden"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="min-h-screen lg:pl-[244px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-slate-200 p-2 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">
                Learning portal
              </p>
              <h1 className="text-lg font-bold">
                {activeView === "explore"
                  ? "Explore Courses"
                  : activeView === "settings"
                    ? "Settings"
                    : activeView === "communities"
                      ? "Communities"
                      : activeView === "sessions"
                        ? "My Sessions"
                        : activeView === "assessments"
                          ? "My Resources"
                          : "My Courses"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">
              Welcome back, {profileUser?.name || "Learner"}
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
              {(profileUser?.name || "L").slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8">
          {activeView === "explore" ? (
            <ExplorePanel />
          ) : activeView === "settings" ? (
            <SettingsPanel
              user={profileUser || user}
              onUserUpdated={(updated) => {
                const nextUser = {
                  ...(profileUser || user || {}),
                  ...(updated || {}),
                };
                setProfileUser(nextUser);
                try {
                  for (const key of ["user", "skybirds-user", "currentUser"]) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                      const parsed = JSON.parse(stored);
                      if (parsed && typeof parsed === "object")
                        localStorage.setItem(
                          key,
                          JSON.stringify({ ...parsed, ...(updated || {}) }),
                        );
                    }
                  }
                } catch {}
              }}
            />
          ) : activeView === "communities" ? (
            <CommunitiesPanel />
          ) : activeView === "sessions" ? (
            <MySessionsPanel />
          ) : activeView === "assessments" ? (
            <MyAssessmentsPanel />
          ) : (
            <>
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"
              >
                <div>
                  <p className="text-sm font-semibold text-amber-600">
                    YOUR LEARNING JOURNEY
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Keep your momentum going.
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Pick up where you left off and continue learning.
                  </p>
                </div>
                <Link
                  to="/courses"
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#12223a] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#203753]"
                >
                  <ShoppingBag size={16} /> Explore courses{" "}
                  <ChevronRight size={16} />
                </Link>
              </motion.section>
              <section className="mb-6 grid gap-4 sm:grid-cols-3">
                <Stat
                  icon={BookOpen}
                  label="Purchased courses"
                  value={owned.length}
                  accent="amber"
                />
                <Stat
                  icon={PlayCircle}
                  label="Ready to learn"
                  value={owned.length}
                  accent="blue"
                />
                <Stat
                  icon={LayoutDashboard}
                  label="Account status"
                  value="Active"
                  accent="green"
                />
              </section>
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,.03)] sm:p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-lg font-bold">Your library</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      All the courses you have access to, in one place.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:w-64">
                      <Search size={16} className="shrink-0 text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search your courses"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      />
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                    >
                      <option value="all">All categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {loading ? (
                  <div className="grid min-h-48 place-items-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-amber-200 border-t-amber-500" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
                      <BookOpen size={25} />
                    </span>
                    <h4 className="mt-4 font-bold">
                      {owned.length
                        ? "No matching courses"
                        : "Your learning library is waiting"}
                    </h4>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      {owned.length
                        ? "Try another search or category."
                        : "Once you purchase a course, it will appear here so you can start learning."}
                    </p>
                    {!owned.length && (
                      <Link
                        to="/courses"
                        className="mt-5 inline-flex rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
                      >
                        Browse courses
                      </Link>
                    )}
                  </div>
                ) : (
                  <motion.div
                    layout
                    className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {filtered.map((course, index) => (
                      <CourseTile
                        key={course.id || course._id}
                        course={course}
                        index={index}
                      />
                    ))}
                  </motion.div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function WhatsAppIcon({ size = 27, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M16 3.1a12.25 12.25 0 0 0-10.5 18.56L4 28l6.52-1.7A12.25 12.25 0 1 0 16 3.1Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M12.15 10.15c-.3-.68-.62-.7-.9-.71h-.77c-.27 0-.7.1-1.06.5-.36.4-1.4 1.37-1.4 3.34s1.44 3.88 1.64 4.15c.2.27 2.78 4.45 6.86 6.06 3.4 1.34 4.1 1.07 4.84 1 .74-.07 2.38-.97 2.72-1.91.34-.94.34-1.75.24-1.92-.1-.17-.37-.27-.77-.47-.4-.2-2.38-1.17-2.75-1.3-.37-.14-.64-.2-.9.2-.27.4-1.04 1.3-1.27 1.57-.24.27-.47.3-.87.1-.4-.2-1.7-.63-3.24-2.01-1.2-1.07-2.02-2.39-2.26-2.79-.24-.4-.03-.62.18-.82.18-.18.4-.47.6-.7.2-.24.27-.4.4-.67.14-.27.07-.5-.03-.7-.1-.2-.87-2.18-1.22-2.92Z"
        fill="currentColor"
        transform="translate(2.5 1.4) scale(.86)"
      />
    </svg>
  );
}

function CommunitiesPanel() {
  const whatsappUrl = import.meta.env.VITE_WHATSAPP_COMMUNITY_URL || "";
  const telegramUrl = import.meta.env.VITE_TELEGRAM_COMMUNITY_URL || "";
  const communities = [
    {
      key: "whatsapp",
      title: "WhatsApp Community",
      description:
        "Get important announcements, learning updates, and connect with fellow learners.",
      detail: "Quick updates · Learner network",
      Icon: WhatsAppIcon,
      tone: "from-emerald-500 to-green-600",
      glow: "bg-emerald-500/10",
      url: whatsappUrl,
      action: "Join WhatsApp",
    },
    {
      key: "telegram",
      title: "Telegram Channel",
      description:
        "Follow course announcements, new resources, and useful learning reminders in one place.",
      detail: "Channel updates · Learning resources",
      Icon: Send,
      tone: "from-sky-500 to-blue-600",
      glow: "bg-sky-500/10",
      url: telegramUrl,
      action: "Join Telegram",
    },
  ];
  return (
    <div className="space-y-7">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative isolate overflow-hidden rounded-3xl bg-[#10233d] px-6 py-8 text-white shadow-[0_18px_50px_rgba(15,23,42,.12)] sm:px-9 sm:py-10"
      >
        <div className="absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 -z-10 h-48 w-48 rounded-full bg-sky-400/15 blur-3xl" />
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-amber-200"
        >
          <Sparkles size={14} /> LEARN TOGETHER
        </motion.span>
        <h2 className="mt-5 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl">
          Your learning community starts here.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
          Join our official community spaces to stay connected, receive updates,
          and keep moving forward with your learning journey.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-white/60">
          <span className="rounded-full border border-white/15 px-3 py-1.5">
            Announcements
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1.5">
            Learning updates
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1.5">
            Community support
          </span>
        </div>
      </motion.section>
      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-600">
            CONNECT WITH US
          </p>
          <h3 className="mt-1 text-xl font-extrabold">Choose your community</h3>
          <p className="mt-1 text-sm text-slate-500">
            Pick the platform that works best for you.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {communities.map((community, index) => {
            const Icon = community.Icon;
            return (
              <motion.article
                key={community.key}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,.04)] transition-shadow hover:shadow-[0_18px_42px_rgba(15,23,42,.10)] sm:p-7"
              >
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full ${community.glow} blur-2xl transition-transform duration-500 group-hover:scale-150`}
                />
                <div className="relative flex items-start justify-between gap-4">
                  <span
                    className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${community.tone} text-white shadow-lg`}
                  >
                    <Icon size={27} />
                  </span>
                  <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Official community
                  </span>
                </div>
                <h4 className="relative mt-5 text-lg font-extrabold">
                  {community.title}
                </h4>
                <p className="relative mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
                  {community.description}
                </p>
                <p className="relative mt-4 text-xs font-semibold text-slate-400">
                  {community.detail}
                </p>
                {community.url ? (
                  <a
                    href={community.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${community.tone} px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-slate-200`}
                  >
                    {community.action}
                    <ExternalLink size={15} />
                  </a>
                ) : (
                  <div className="relative mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs leading-5 text-slate-500">
                    Community link will appear here once configured.
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-slate-400">
          Please follow the community guidelines and never share passwords or
          verification codes.
        </p>
      </section>
    </div>
  );
}

function ExplorePanel() {
  const [courses, setCourses] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [platform, setPlatform] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [courseResult, platformResult] = await Promise.all([
          fetchCourses(),
          fetchPlatforms(),
        ]);
        if (cancelled) return;
        if (courseResult?.success) setCourses(courseResult.data || []);
        if (platformResult?.success) setPlatforms(platformResult.data || []);
      } catch (err) {
        if (!cancelled)
          setError(
            err.response?.data?.message || "Unable to load courses right now.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () =>
      courses.filter((course) => {
        const matchesPlatform =
          platform === "all" || course.platform === platform;
        const matchesQuery =
          `${course.title || ""} ${course.platform || ""} ${course.description || ""}`
            .toLowerCase()
            .includes(query.toLowerCase());
        return matchesPlatform && matchesQuery;
      }),
    [courses, platform, query],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <p className="text-sm font-semibold text-amber-600">
          FIND YOUR NEXT SKILL
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Explore all courses
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Browse the full course catalog and find your next learning path.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 md:max-w-md md:flex-1">
            <Search size={17} className="shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all courses..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPlatform("all")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${platform === "all" ? "bg-[#12223a] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              All courses
            </button>
            {platforms.map((item) => (
              <button
                key={item.id}
                onClick={() => setPlatform(item.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${platform === item.id ? "bg-[#12223a] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="grid min-h-48 place-items-center">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-amber-200 border-t-amber-500" />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl bg-red-50 p-6 text-sm text-red-700">
            {error}
            <button
              onClick={() => window.location.reload()}
              className="ml-3 font-bold underline"
            >
              Retry
            </button>
          </div>
        ) : visible.length ? (
          <motion.div
            layout
            className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            {visible.map((course) => (
              <CourseCard key={course.id || course._id} course={course} />
            ))}
          </motion.div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <BookOpen size={28} className="mx-auto text-slate-400" />
            <p className="mt-3 font-bold">No courses found</p>
            <p className="mt-1 text-sm text-slate-500">
              Try another search or platform filter.
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
  };
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.03)]"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${tones[accent]}`}
        >
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold">{value}</p>
    </motion.div>
  );
}

function CourseTile({ course, index }) {
  const id = course.id || course._id;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.25), duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-xl hover:shadow-slate-900/5"
    >
      <Link to={`/watch/${id}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title || "Course thumbnail"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-[#13243b] to-[#344c68] text-white">
              <GraduationCap size={42} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <span className="absolute bottom-3 left-3 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {course.platform || "Course"}
          </span>
          <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-amber-400 text-slate-950 shadow-lg transition group-hover:scale-110">
            <PlayCircle size={21} />
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h4 className="line-clamp-2 min-h-12 font-bold leading-6 text-slate-800">
              {course.title}
            </h4>
            {course.price != null && (
              <span className="shrink-0 text-xs font-semibold text-slate-500">
                {formatPrice(course.price)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {course.duration || "Self-paced learning"}
            {course.purchasedAt
              ? ` · Purchased ${new Date(course.purchasedAt).toLocaleDateString("en-IN")}`
              : ""}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs font-semibold text-emerald-700">
              Access available
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 transition group-hover:text-amber-700">
              View course{" "}
              <ChevronRight
                size={14}
                className="transition group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
