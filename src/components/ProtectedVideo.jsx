import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useUser } from "../context/UserContext";
import { Lock, ShieldAlert, Play, ArrowRight, RotateCcw } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const MAX_RECOVERY_ATTEMPTS = 3;
const MAX_AUTO_SKIP_GAP = 0.5;

export default function ProtectedVideo({
  title,
  courseId,
  videoId,
  nextVideo,
  onPlayNext,
}) {
  const { user, token } = useUser();

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const recoveryAttemptsRef = useRef(0);
  const retryTimerRef = useRef(null);

  const [blocked, setBlocked] = useState(false);
  const [loadingStream, setLoadingStream] = useState(true);
  const [streamError, setStreamError] = useState("");
  const [hasEnded, setHasEnded] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retryPlayback = useCallback(() => {
    setStreamError("");
    setLoadingStream(true);
    setIsRecovering(false);
    setHasEnded(false);
    recoveryAttemptsRef.current = 0;
    setReloadKey((key) => key + 1);
  }, []);

  const recoverBufferGap = () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) return;

    const currentTime = video.currentTime;

    for (let i = 1; i < video.buffered.length; i++) {
      const previousEnd = video.buffered.end(i - 1);
      const nextStart = video.buffered.start(i);

      // Recover only when playback is immediately before a small gap.
      if (
        currentTime >= previousEnd - 0.5 &&
        currentTime < nextStart &&
        nextStart - currentTime <= 1
      ) {
        video.currentTime = nextStart + 0.05;
        return;
      }
    }
  };

  // Authorize and initialize secure HLS playback.
  useEffect(() => {
    let active = true;
    let hlsInstance = null;
    let nativeVideo = null;

    setHasEnded(false);
    setIsRecovering(false);
    setLoadingStream(true);
    setStreamError("");
    recoveryAttemptsRef.current = 0;

    const showPlaybackError = (message) => {
      if (!active) return;
      setLoadingStream(false);
      setIsRecovering(false);
      setStreamError(message);
    };

    async function start() {
      if (!API_BASE || !token || !courseId || !videoId) {
        showPlaybackError(
          "This lesson is not configured for secure playback. Please refresh the page.",
        );
        return;
      }

      try {
        const authResponse = await fetch(
          `${API_BASE}/courses/${encodeURIComponent(
            courseId,
          )}/videos/${encodeURIComponent(videoId)}/playback`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const authData = await authResponse.json().catch(() => ({}));

        if (!authResponse.ok) {
          const error = new Error(
            authData.message || "Playback authorization failed",
          );
          error.status = authResponse.status;
          throw error;
        }

        if (!authData.masterUrl || !authData.token) {
          throw new Error(
            "The server returned invalid playback authorization.",
          );
        }

        const masterUrl = new URL(authData.masterUrl, `${API_BASE}/`);
        masterUrl.searchParams.set("token", authData.token);

        const streamUrl = masterUrl.toString();
        const video = videoRef.current;

        if (!video) {
          throw new Error("Video player is unavailable.");
        }

        nativeVideo = video;

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = streamUrl;
          video.load();
          setLoadingStream(false);
        } else if (Hls.isSupported()) {
          hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 60,
            maxBufferLength: 60,
            maxMaxBufferLength: 120,

            // Buffer-gap and playback-stall recovery.
            maxBufferHole: 1,
            maxFragLookUpTolerance: 0.25,
            highBufferWatchdogPeriod: 2,
            nudgeOffset: 0.1,
            nudgeMaxRetry: 5,

            manifestLoadingTimeOut: 20000,
            levelLoadingTimeOut: 20000,
            fragLoadingTimeOut: 30000,
            manifestLoadingMaxRetry: 3,
            levelLoadingMaxRetry: 3,
            fragLoadingMaxRetry: 4,
            fragLoadingRetryDelay: 1000,
            fragLoadingMaxRetryTimeout: 8000,

            xhrSetup: (xhr) => {
              xhr.setRequestHeader("Authorization", `Bearer ${authData.token}`);
            },
          });

          hlsRef.current = hlsInstance;

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!active) return;
            setLoadingStream(false);
            setStreamError("");
          });

          hlsInstance.on(Hls.Events.FRAG_BUFFERED, () => {
            if (!active) return;
            recoveryAttemptsRef.current = 0;
            setIsRecovering(false);
          });

          hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
            if (!active || !data?.fatal) return;

            const status = data.response?.code;

            console.error("Fatal HLS playback error:", {
              type: data.type,
              details: data.details,
              status,
            });

            if (status === 410) {
              showPlaybackError(
                "Playback authorization expired. Reload the lesson.",
              );
              hlsInstance.stopLoad();
              return;
            }

            if (status === 401 || status === 403) {
              showPlaybackError(
                "Playback access denied. Please sign in again.",
              );
              hlsInstance.stopLoad();
              return;
            }

            if (recoveryAttemptsRef.current >= MAX_RECOVERY_ATTEMPTS) {
              showPlaybackError(
                "Video playback failed. Reload the lesson and try again.",
              );
              return;
            }

            recoveryAttemptsRef.current += 1;
            setIsRecovering(true);

            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hlsInstance.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hlsInstance.recoverMediaError();
            } else {
              showPlaybackError(
                "Unable to play this video. Please reload the lesson.",
              );
              hlsInstance.destroy();

              if (hlsRef.current === hlsInstance) {
                hlsRef.current = null;
              }
            }
          });

          hlsInstance.loadSource(streamUrl);
          hlsInstance.attachMedia(video);
        } else {
          throw new Error("This browser does not support HLS playback.");
        }
      } catch (error) {
        if (!active) return;

        setLoadingStream(false);
        setIsRecovering(false);

        if (error.status === 401) {
          setStreamError("Please log in again to continue.");
        } else if (error.status === 403) {
          setStreamError("You do not own this course.");
        } else if (error.status === 404) {
          setStreamError("This lesson is not available.");
        } else if (error.status === 410) {
          setStreamError("Playback authorization expired. Reload the lesson.");
        } else {
          console.error("Playback initialization failed:", error);
          setStreamError(error.message || "Unable to start secure playback.");
        }
      }
    }

    start();

    return () => {
      active = false;

      if (hlsInstance) {
        hlsInstance.destroy();
      }

      if (hlsRef.current === hlsInstance) {
        hlsRef.current = null;
      }

      if (nativeVideo) {
        nativeVideo.pause();
        nativeVideo.removeAttribute("src");
        nativeVideo.load();
      }
    };
  }, [courseId, videoId, token, reloadKey]);

  // Detect stalled playback and recover small gaps between buffered ranges.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    let lastTime = video.currentTime;
    let lastProgressAt = Date.now();
    let waitingSince = 0;
    let recoveryCount = 0;

    const resetRecovery = () => {
      lastTime = video.currentTime;
      lastProgressAt = Date.now();
      waitingSince = 0;
      recoveryCount = 0;
      setIsRecovering(false);
    };

    const markWaiting = () => {
      waitingSince = Date.now();
      lastProgressAt = Date.now();
      setIsRecovering(true);
    };

    const getBufferedRanges = () => {
      const ranges = [];

      for (let i = 0; i < video.buffered.length; i += 1) {
        ranges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        });
      }

      return ranges;
    };

    const findNextRange = (time) => {
      const ranges = getBufferedRanges();

      for (let i = 0; i < ranges.length; i += 1) {
        const range = ranges[i];

        if (time >= range.start - 0.05 && time <= range.end + 0.05) {
          if (i + 1 < ranges.length) {
            return {
              currentEnd: range.end,
              nextStart: ranges[i + 1].start,
            };
          }

          return null;
        }

        if (range.start > time) {
          return {
            currentEnd: time,
            nextStart: range.start,
          };
        }
      }

      return null;
    };

    const attemptRecovery = () => {
      if (video.paused || video.ended) {
        setIsRecovering(false);
        return;
      }

      if (recoveryCount >= MAX_RECOVERY_ATTEMPTS) {
        setIsRecovering(false);

        console.warn("Video stall recovery limit reached", {
          currentTime: video.currentTime,
          buffered: getBufferedRanges(),
        });

        return;
      }

      recoveryCount += 1;
      lastProgressAt = Date.now();
      setIsRecovering(true);

      const hls = hlsRef.current;
      const gap = findNextRange(video.currentTime);

      // Skip only a very small gap that the player is stuck before.
      // Never jump across a large missing section.
      if (
        gap &&
        waitingSince &&
        Date.now() - waitingSince >= 1500 &&
        gap.nextStart > video.currentTime &&
        gap.nextStart - video.currentTime <= MAX_AUTO_SKIP_GAP
      ) {
        try {
          const targetTime = Math.min(
            gap.nextStart + 0.03,
            Math.max(0, video.duration - 0.05),
          );

          console.warn("Recovering small buffered gap", {
            from: video.currentTime,
            to: targetTime,
            gap: gap.nextStart - video.currentTime,
          });

          video.currentTime = targetTime;

          if (hls) {
            hls.startLoad(targetTime);
          }
        } catch (error) {
          console.error("Gap recovery failed:", error);
          setIsRecovering(false);
        }

        return;
      }

      if (hls) {
        try {
          // Ask HLS.js to load from the current playback position.
          hls.startLoad(video.currentTime);
        } catch (error) {
          console.error("HLS recovery failed:", error);
          setIsRecovering(false);
        }
      } else {
        // Native HLS fallback: only seek across a confirmed tiny gap.
        if (video.error) {
          console.error("Native playback error:", video.error);
        }

        setIsRecovering(false);
      }
    };

    const checkProgress = () => {
      if (video.paused || video.ended) {
        lastTime = video.currentTime;
        lastProgressAt = Date.now();
        return;
      }

      if (Math.abs(video.currentTime - lastTime) > 0.1) {
        lastTime = video.currentTime;
        lastProgressAt = Date.now();
        waitingSince = 0;
        recoveryCount = 0;
        setIsRecovering(false);
        return;
      }

      if (Date.now() - lastProgressAt < 8000) {
        return;
      }

      attemptRecovery();
    };

    const interval = window.setInterval(checkProgress, 1000);

    video.addEventListener("playing", resetRecovery);
    video.addEventListener("timeupdate", resetRecovery);
    video.addEventListener("canplay", resetRecovery);
    video.addEventListener("seeked", resetRecovery);
    video.addEventListener("waiting", markWaiting);
    video.addEventListener("ended", resetRecovery);

    return () => {
      window.clearInterval(interval);

      video.removeEventListener("playing", resetRecovery);
      video.removeEventListener("timeupdate", resetRecovery);
      video.removeEventListener("canplay", resetRecovery);
      video.removeEventListener("seeked", resetRecovery);
      video.removeEventListener("waiting", markWaiting);
      video.removeEventListener("ended", resetRecovery);
    };
  }, [videoId]);

  // Block selected download shortcuts and context menu.
  useEffect(() => {
    const blockContextMenu = (event) => {
      if (containerRef.current?.contains(event.target)) {
        event.preventDefault();
      }
    };

    const onKey = (event) => {
      const key = event.key.toLowerCase();

      const blockedKey =
        (event.ctrlKey && ["s", "p", "u"].includes(key)) ||
        (event.metaKey && ["s", "p"].includes(key)) ||
        key === "printscreen" ||
        key === "f12";

      if (
        blockedKey &&
        containerRef.current?.contains(document.activeElement)
      ) {
        event.preventDefault();
        setBlocked(true);
        videoRef.current?.pause();

        if (retryTimerRef.current) {
          window.clearTimeout(retryTimerRef.current);
        }

        retryTimerRef.current = window.setTimeout(() => {
          setBlocked(false);
          retryTimerRef.current = null;
        }, 2500);
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", onKey);

      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const handleReplay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setHasEnded(false);
      setIsRecovering(false);
      recoveryAttemptsRef.current = 0;
      video.currentTime = 0;

      const hls = hlsRef.current;

      if (hls) {
        hls.startLoad(0);
      }

      await video.play();
    } catch (error) {
      console.error("Unable to replay video:", error);
    }
  };

  const handlePlayNext = () => {
    if (typeof onPlayNext === "function" && nextVideo) {
      setHasEnded(false);
      onPlayNext();
    }
  };

  const handleVideoEnded = () => {
    setHasEnded(true);
    setIsRecovering(false);
  };

  const watermarkText = `${
    user?.email || (user?.mobile ? `+91 ${user.mobile}` : "SkyBirds Learner")
  } • SKYBIRD SOLUTION`;

  return (
    <div className="select-none">
      <div
        ref={containerRef}
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl"
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        style={{ backgroundColor: "#000" }}
      >
        <video
          ref={videoRef}
          controls
          controlsList="nodownload noremoteplayback nofullscreen"
          disablePictureInPicture
          disableRemotePlayback
          playsInline
          onWaiting={recoverBufferGap}
          preload="metadata"
          onEnded={handleVideoEnded}
          onPlaying={() => {
            setHasEnded(false);
            setIsRecovering(false);
          }}
          onError={() => {
            const video = videoRef.current;

            if (video?.error) {
              console.warn(
                "Video playback error:",
                video.error.code,
                video.error.message,
              );
            }
          }}
          className={`h-full w-full object-contain ${
            loadingStream || streamError ? "invisible absolute" : ""
          }`}
          onContextMenu={(event) => event.preventDefault()}
        />

        {loadingStream && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-xs font-medium">Authorizing secure video...</p>
          </div>
        )}

        {streamError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
            <p className="text-sm font-semibold">{streamError}</p>

            <button
              type="button"
              onClick={retryPlayback}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <RotateCcw size={16} />
              Reload video
            </button>
          </div>
        )}

        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 select-none whitespace-nowrap">
          <p className="rounded-md bg-black/25 px-3 py-1 text-center text-[10px] font-bold tracking-wider text-white/50 drop-shadow-md sm:text-xs">
            {watermarkText}
          </p>
        </div>

        {isRecovering && !loadingStream && !streamError && !hasEnded && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-xl bg-black/75 px-4 py-3 text-sm font-medium text-white backdrop-blur">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Reconnecting video...
            </div>
          </div>
        )}

        {hasEnded && !loadingStream && !streamError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-md">
            <div className="flex w-full max-w-md flex-col items-center gap-3">
              {nextVideo && (
                <button
                  type="button"
                  onClick={handlePlayNext}
                  className="group inline-flex w-full cursor-pointer items-center gap-4 rounded-xl border border-white/15 bg-slate-950/90 px-5 py-4 text-white shadow-xl transition-all duration-300 hover:border-amber-400/60 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-slate-950 transition-colors group-hover:bg-amber-300">
                    <Play size={19} fill="currentColor" strokeWidth={2.5} />
                  </span>

                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-bold sm:text-base">
                      Play Next
                    </span>

                    <span className="mt-1 block truncate text-xs text-slate-300">
                      {nextVideo.title || "Next Lesson"}
                    </span>
                  </span>

                  <ArrowRight
                    size={18}
                    className="shrink-0 text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-amber-400"
                  />
                </button>
              )}

              <button
                type="button"
                onClick={handleReplay}
                className="group inline-flex w-full cursor-pointer items-center gap-4 rounded-xl border border-white/15 bg-slate-950/90 px-5 py-4 text-white shadow-xl transition-all duration-300 hover:border-amber-400/60 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-slate-950 transition-colors group-hover:bg-amber-300">
                  <RotateCcw size={19} />
                </span>

                <span className="flex-1 text-left">
                  <span className="block text-sm font-bold sm:text-base">
                    Replay Video
                  </span>

                  <span className="mt-1 block text-xs text-slate-300">
                    Watch this lesson again
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {blocked && (
          <div className="absolute right-4 top-4 z-40 flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
            <ShieldAlert className="h-3.5 w-3.5" />
            Download shortcut blocked
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>

          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/60">
            <Lock className="h-3 w-3 text-leaf" />
            Protected HLS streaming • purchase authorization • short-lived
            access
          </p>
        </div>
      </div>
    </div>
  );
}
