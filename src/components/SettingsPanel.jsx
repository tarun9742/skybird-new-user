import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserRound,
  Smartphone,
  LockKeyhole,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

const API_BASE = (
  import.meta.env.VITE_API_URL || "https://course-api-sp35.onrender.com/api"
).replace(/\/$/, "");
function getToken() {
  // Match the token key used by the existing UserContext and API axios client.
  return (
    localStorage.getItem("skybirds-token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("userToken") ||
    localStorage.getItem("authToken") ||
    ""
  );
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false)
    throw new Error(result.message || "Request failed");
  return result;
}

export default function SettingsPanel({ user, onUserUpdated }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setMobile(user?.mobile || "");
    setEmail(user?.email || "");
  }, [user?.name, user?.mobile]);

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length > 100) {
      return setError("Enter a name between 1 and 100 characters.");
    }

    if (
      !trimmedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) ||
      trimmedEmail.length > 254
    ) {
      return setError("Enter a valid email address.");
    }

    setSaving(true);

    try {
      const result = await api("/customer/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
        }),
      });

      onUserUpdated?.(result.data);
      setNotice("Profile updated successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 8)
      return setError("New password must contain at least 8 characters.");
    if (newPassword !== confirmPassword)
      return setError("New password and confirmation do not match.");
    setPasswordSaving(true);
    try {
      const result = await api("/customer/change-password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setNotice(result.message || "Password changed successfully.");
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  const field =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100";
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl space-y-6"
    >
      <div>
        <p className="text-sm font-semibold text-amber-600">ACCOUNT SETTINGS</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Your profile
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Manage your personal details and account password.
        </p>
      </div>
      <form
        onSubmit={saveProfile}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
            <UserRound size={23} />
          </span>
          <div>
            <h3 className="font-bold text-slate-900">Personal information</h3>
            <p className="text-sm text-slate-500">
              Only your name can be edited.
            </p>
          </div>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Full name
          <input
            className={field}
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
            required
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700 mt-5">
          Email
          <input
            className={field}
            value={email}
            maxLength={100}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
        </label>
        <label className="mt-5 block text-sm font-semibold text-slate-700">
          Mobile number{" "}
          <span className="ml-1 text-xs font-medium text-slate-400">
            Cannot be changed
          </span>
          <span
            className={`${field} flex items-center gap-2 bg-slate-50 text-slate-500`}
          >
            <Smartphone size={17} />
            <input
              className="w-full bg-transparent outline-none"
              value={mobile}
              readOnly
              aria-readonly="true"
            />
          </span>
        </label>
        {error && !passwordOpen && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"
          >
            <CheckCircle2 size={17} />
            {notice}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            disabled={saving}
            className="rounded-xl bg-[#12223a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#203753] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPasswordOpen(true);
              setError("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <LockKeyhole size={16} /> Change password
          </button>
        </div>
      </form>
      <AnimatePresence>
        {passwordOpen && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setPasswordOpen(false);
            }}
          >
            <motion.form
              onSubmit={savePassword}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700">
                    <LockKeyhole size={21} />
                  </span>
                  <h3 className="mt-4 text-xl font-extrabold text-slate-900">
                    Change password
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose a strong password you have not used before.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordOpen(false)}
                  aria-label="Close dialog"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>
              <label className="mt-5 block text-sm font-semibold text-slate-700">
                Current password
                <input
                  className={field}
                  type={showPasswords ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </label>
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                New password
                <input
                  className={field}
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </label>
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Confirm new password
                <input
                  className={field}
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
              >
                {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}{" "}
                {showPasswords ? "Hide passwords" : "Show passwords"}
              </button>
              {error && passwordOpen && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}
              <div className="mt-5 flex gap-3">
                <button
                  disabled={passwordSaving}
                  className="flex-1 rounded-xl bg-[#12223a] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {passwordSaving ? "Updating…" : "Update password"}
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
