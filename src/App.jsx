import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SECONDS = 135;
const DEFAULT_QUESTIONS = 31;
const PAGE_TIMER_STORAGE_KEY = "page-revision-timer-history-v1";

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (Number.isNaN(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function beep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.25);
  } catch (error) {
    // Audio is optional.
  }
}

function getCurrentTool() {
  return window.location.pathname === "/page-timer" ? "page" : "gmat";
}

function ToolNavigation({ activeTool, onNavigate }) {
  const baseButton =
    "rounded-full px-4 py-2 text-sm font-black transition sm:px-5";

  return (
    <nav className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">
            Practice Timers
          </p>
          <p className="text-xs font-semibold text-slate-400">
            GMAT questions + page revision tracking
          </p>
        </div>

        <div className="flex rounded-full bg-slate-100 p-1">
          <button
            onClick={() => onNavigate("/")}
            className={`${baseButton} ${
              activeTool === "gmat"
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            GMAT Timer
          </button>
          <button
            onClick={() => onNavigate("/page-timer")}
            className={`${baseButton} ${
              activeTool === "page"
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Page Timer
          </button>
        </div>
      </div>
    </nav>
  );
}

function GMATQuestionTimer() {
  const [questionCountInput, setQuestionCountInput] = useState(String(DEFAULT_QUESTIONS));
  const [secondsInput, setSecondsInput] = useState(String(DEFAULT_SECONDS));
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTIONS);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(DEFAULT_SECONDS);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [overTimeQuestions, setOverTimeQuestions] = useState([]);
  const timerRef = useRef(null);

  const progress = useMemo(() => {
    return Math.round((completedQuestions.length / questionCount) * 100);
  }, [completedQuestions.length, questionCount]);

  const totalTargetTime = useMemo(() => {
    return questionCount * secondsPerQuestion;
  }, [questionCount, secondsPerQuestion]);

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime <= 1) {
          window.clearInterval(timerRef.current);
          setIsRunning(false);
          setOverTimeQuestions((existingQuestions) =>
            existingQuestions.includes(currentQuestion)
              ? existingQuestions
              : [...existingQuestions, currentQuestion]
          );
          beep();
          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerRef.current);
  }, [isRunning, currentQuestion]);

  function applySettings() {
    const newQuestionCount = clampNumber(questionCountInput, 1, 60, DEFAULT_QUESTIONS);
    const newSecondsPerQuestion = clampNumber(secondsInput, 10, 600, DEFAULT_SECONDS);

    setQuestionCount(newQuestionCount);
    setSecondsPerQuestion(newSecondsPerQuestion);
    setQuestionCountInput(String(newQuestionCount));
    setSecondsInput(String(newSecondsPerQuestion));
    setCurrentQuestion(1);
    setTimeLeft(newSecondsPerQuestion);
    setIsRunning(false);
    setCompletedQuestions([]);
    setOverTimeQuestions([]);
  }

  function markQuestionDone() {
    setCompletedQuestions((existingQuestions) =>
      existingQuestions.includes(currentQuestion)
        ? existingQuestions
        : [...existingQuestions, currentQuestion]
    );

    goToNextQuestion();
  }

  function goToNextQuestion() {
    setIsRunning(false);

    if (currentQuestion >= questionCount) return;

    setCurrentQuestion((question) => question + 1);
    setTimeLeft(secondsPerQuestion);
  }

  function resetCurrentQuestion() {
    setIsRunning(false);
    setTimeLeft(secondsPerQuestion);
    setOverTimeQuestions((existingQuestions) =>
      existingQuestions.filter((question) => question !== currentQuestion)
    );
  }

  function restartFullSet() {
    setIsRunning(false);
    setCurrentQuestion(1);
    setTimeLeft(secondsPerQuestion);
    setCompletedQuestions([]);
    setOverTimeQuestions([]);
  }

  function jumpToQuestion(question) {
    setIsRunning(false);
    setCurrentQuestion(question);
    setTimeLeft(secondsPerQuestion);
  }

  const isLastQuestion = currentQuestion === questionCount;
  const isTimeUp = timeLeft === 0;
  const isWarning = timeLeft > 0 && timeLeft <= 30;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 text-slate-950 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
      <section className="space-y-6">
        <header>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.24em] text-slate-500">
            GMAT Practice Timer
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            2:15 per question
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Practice with a clean per-question countdown. Finish, skip, reset, or jump between questions while keeping a simple session summary.
          </p>
        </header>

        <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Current question</p>
              <p className="text-2xl font-black">
                Question {currentQuestion} of {questionCount}
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              {progress}% complete
            </div>
          </div>

          <div
            className={`mx-auto flex h-64 w-64 items-center justify-center rounded-full border-8 sm:h-80 sm:w-80 ${
              isTimeUp
                ? "border-red-300 bg-red-50"
                : isWarning
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                Time left
              </p>
              <div
                className={`text-6xl font-black tabular-nums sm:text-7xl ${
                  isTimeUp ? "text-red-600" : "text-slate-950"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                Target: {formatTime(secondsPerQuestion)} / question
              </p>
              {isTimeUp && <p className="mt-2 font-bold text-red-600">Time up. Move on.</p>}
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => setIsRunning((running) => !running)}
              disabled={isTimeUp}
              className="h-12 rounded-2xl bg-slate-950 px-4 text-base font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isRunning ? "Pause" : "Start"}
            </button>

            <button
              onClick={markQuestionDone}
              className="h-12 rounded-2xl bg-emerald-100 px-4 text-base font-bold text-emerald-800 transition hover:bg-emerald-200"
            >
              {isLastQuestion ? "Finish" : "Done"}
            </button>

            <button
              onClick={goToNextQuestion}
              disabled={isLastQuestion}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Skip
            </button>

            <button
              onClick={resetCurrentQuestion}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Reset Q
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-black">Custom settings</h2>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">Number of questions</span>
              <input
                type="number"
                min="1"
                max="60"
                value={questionCountInput}
                onChange={(event) => setQuestionCountInput(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 font-semibold outline-none focus:border-slate-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">Seconds per question</span>
              <input
                type="number"
                min="10"
                max="600"
                value={secondsInput}
                onChange={(event) => setSecondsInput(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 font-semibold outline-none focus:border-slate-500"
              />
              <p className="mt-2 text-sm text-slate-500">2 minutes 15 seconds = 135 seconds.</p>
            </label>

            <button
              onClick={applySettings}
              className="h-11 w-full rounded-xl bg-slate-100 font-bold text-slate-800 transition hover:bg-slate-200"
            >
              Apply settings
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-black">Session summary</h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-500">Completed</p>
              <p className="text-2xl font-black">{completedQuestions.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-500">Over time</p>
              <p className="text-2xl font-black">{overTimeQuestions.length}</p>
            </div>
            <div className="col-span-2 rounded-2xl bg-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-500">Total target time</p>
              <p className="text-2xl font-black">{formatTime(totalTargetTime)}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-bold text-slate-600">Question map</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: questionCount }, (_, index) => {
                const question = index + 1;
                const isActive = question === currentQuestion;
                const isDone = completedQuestions.includes(question);
                const isLate = overTimeQuestions.includes(question);

                let buttonClass = "bg-slate-100 text-slate-600 hover:bg-slate-200";
                if (isLate) buttonClass = "bg-red-100 text-red-700";
                if (isDone) buttonClass = "bg-emerald-100 text-emerald-700";
                if (isActive) buttonClass = "bg-slate-950 text-white";

                return (
                  <button
                    key={question}
                    onClick={() => jumpToQuestion(question)}
                    className={`h-9 w-9 rounded-xl text-sm font-black transition ${buttonClass}`}
                    aria-label={`Go to question ${question}`}
                  >
                    {question}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={restartFullSet}
            className="mt-5 h-11 w-full rounded-xl border border-slate-200 bg-white font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Restart full set
          </button>
        </div>
      </aside>
    </main>
  );
}

function PageRevisionTimer() {
  const [subject, setSubject] = useState("General Revision");
  const [pageInput, setPageInput] = useState("1");
  const [minutesInput, setMinutesInput] = useState("5");
  const [mode, setMode] = useState("countdown");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [history, setHistory] = useState([]);
  const [soundOn, setSoundOn] = useState(false);
  const [notifiedForCurrentPage, setNotifiedForCurrentPage] = useState(false);
  const intervalRef = useRef(null);

  const targetSeconds = Math.max(60, clampNumber(minutesInput, 1, 240, 5) * 60);
  const currentPage = Math.max(1, clampNumber(pageInput, 1, 9999, 1));
  const remainingSeconds = targetSeconds - elapsedSeconds;
  const completedRows = history.filter((row) => row.status === "Done");
  const totalSeconds = completedRows.reduce((sum, row) => sum + row.elapsedSeconds, 0);
  const averageSeconds = completedRows.length ? Math.round(totalSeconds / completedRows.length) : 0;
  const onTimeCount = completedRows.filter((row) => row.elapsedSeconds <= row.targetSeconds).length;
  const onTimeRate = completedRows.length ? Math.round((onTimeCount / completedRows.length) * 100) : 0;

  useEffect(() => {
    try {
      const savedHistory = JSON.parse(localStorage.getItem(PAGE_TIMER_STORAGE_KEY) || "[]");
      if (Array.isArray(savedHistory)) setHistory(savedHistory);
    } catch (error) {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PAGE_TIMER_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(intervalRef.current);
  }, [isRunning]);

  useEffect(() => {
    if (
      soundOn &&
      mode === "countdown" &&
      isRunning &&
      elapsedSeconds >= targetSeconds &&
      !notifiedForCurrentPage
    ) {
      beep();
      setNotifiedForCurrentPage(true);
    }
  }, [elapsedSeconds, isRunning, mode, notifiedForCurrentPage, soundOn, targetSeconds]);

  function resetCurrentPage() {
    setIsRunning(false);
    setElapsedSeconds(0);
    setNotifiedForCurrentPage(false);
  }

  function savePage(status) {
    const row = {
      id: `${Date.now()}-${currentPage}`,
      subject: subject.trim() || "General Revision",
      page: currentPage,
      elapsedSeconds: status === "Skipped" ? 0 : elapsedSeconds,
      targetSeconds,
      status,
      finishedAt: new Date().toISOString(),
    };

    setHistory((rows) => [row, ...rows]);
    setPageInput(String(currentPage + 1));
    setElapsedSeconds(0);
    setNotifiedForCurrentPage(false);
  }

  function exportCsv() {
    const header = ["Subject", "Page", "Actual Time", "Target Time", "Status", "Finished At"];
    const rows = history.map((row) => [
      row.subject,
      row.page,
      formatTime(row.elapsedSeconds),
      formatTime(row.targetSeconds),
      row.status,
      new Date(row.finishedAt).toLocaleString(),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `page-revision-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copySummary() {
    const text = [
      "Page Revision Summary",
      `Subject: ${subject.trim() || "General Revision"}`,
      `Pages completed: ${completedRows.length}`,
      `Total revision time: ${formatTime(totalSeconds)}`,
      `Average time per page: ${formatTime(averageSeconds)}`,
      `On-time rate: ${onTimeRate}%`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // Clipboard is optional.
    }
  }

  const displayTime =
    mode === "countdown" ? formatTime(Math.abs(remainingSeconds)) : formatTime(elapsedSeconds);
  const isOverTarget = elapsedSeconds > targetSeconds;
  const isNearTarget = remainingSeconds > 0 && remainingSeconds <= 60;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-slate-950 sm:px-8">
      <header className="mb-6">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.24em] text-slate-500">
          Page Revision Timer
        </p>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          Revise each page within a fixed time
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Set your target minutes per page, start revising, mark each page done, and keep a browser-saved record of your speed and consistency.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-600">Subject / book / chapter</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 font-semibold outline-none focus:border-slate-500"
                placeholder="Example: Quant, RC, Finance, Chapter 3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">Current page</span>
              <input
                type="number"
                min="1"
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 font-semibold outline-none focus:border-slate-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">Minutes per page</span>
              <input
                type="number"
                min="1"
                value={minutesInput}
                onChange={(event) => setMinutesInput(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 font-semibold outline-none focus:border-slate-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">Mode</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 font-semibold outline-none focus:border-slate-500"
              >
                <option value="countdown">Countdown from target</option>
                <option value="stopwatch">Stopwatch only</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">Sound alert</span>
              <button
                onClick={() => setSoundOn((value) => !value)}
                className="h-11 w-full rounded-xl bg-slate-100 font-bold text-slate-800 transition hover:bg-slate-200"
              >
                Sound: {soundOn ? "On" : "Off"}
              </button>
            </label>
          </div>

          <div className="my-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Revising page {currentPage}
            </p>
            <div
              className={`mt-3 text-7xl font-black tracking-tight tabular-nums sm:text-8xl ${
                isOverTarget ? "text-red-600" : "text-slate-950"
              }`}
            >
              {displayTime}
            </div>
            <p
              className={`mt-4 text-sm font-bold ${
                isOverTarget
                  ? "text-red-600"
                  : isNearTarget
                  ? "text-amber-600"
                  : "text-emerald-700"
              }`}
            >
              {mode === "countdown"
                ? isOverTarget
                  ? `${formatTime(Math.abs(remainingSeconds))} over target`
                  : `${formatTime(remainingSeconds)} left for target`
                : `Target: ${formatTime(targetSeconds)} per page`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setIsRunning((running) => !running)}
              className="h-12 rounded-2xl bg-slate-950 px-4 text-base font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              {isRunning ? "Pause" : elapsedSeconds > 0 ? "Resume" : "Start"}
            </button>
            <button
              onClick={() => savePage("Done")}
              disabled={elapsedSeconds === 0}
              className="h-12 rounded-2xl bg-emerald-100 px-4 text-base font-bold text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark Page Done
            </button>
            <button
              onClick={() => savePage("Skipped")}
              className="h-12 rounded-2xl bg-amber-100 px-4 text-base font-bold text-amber-800 transition hover:bg-amber-200"
            >
              Skip Page
            </button>
            <button
              onClick={resetCurrentPage}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Reset Current Page
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-3xl bg-white p-5 shadow-lg">
              <p className="text-sm font-semibold text-slate-500">Pages done</p>
              <p className="mt-1 text-3xl font-black">{completedRows.length}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-lg">
              <p className="text-sm font-semibold text-slate-500">Total time</p>
              <p className="mt-1 text-3xl font-black tabular-nums">{formatTime(totalSeconds)}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-lg">
              <p className="text-sm font-semibold text-slate-500">Avg/page</p>
              <p className="mt-1 text-3xl font-black tabular-nums">{formatTime(averageSeconds)}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-lg">
              <p className="text-sm font-semibold text-slate-500">On-time</p>
              <p className="mt-1 text-3xl font-black">{onTimeRate}%</p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Revision history</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportCsv}
                  disabled={history.length === 0}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export CSV
                </button>
                <button
                  onClick={copySummary}
                  disabled={history.length === 0}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy Summary
                </button>
                <button
                  onClick={() => setHistory([])}
                  disabled={history.length === 0}
                  className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center font-semibold text-slate-500">
                No pages tracked yet. Start revising and mark your first page done.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                      <th className="py-3 pr-4">Subject</th>
                      <th className="py-3 pr-4">Page</th>
                      <th className="py-3 pr-4">Actual</th>
                      <th className="py-3 pr-4">Target</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Finished</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => {
                      const late = row.status === "Done" && row.elapsedSeconds > row.targetSeconds;
                      return (
                        <tr key={row.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 pr-4 font-bold text-slate-700">{row.subject}</td>
                          <td className="py-3 pr-4 font-black">{row.page}</td>
                          <td className="py-3 pr-4 tabular-nums">{formatTime(row.elapsedSeconds)}</td>
                          <td className="py-3 pr-4 tabular-nums">{formatTime(row.targetSeconds)}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                row.status === "Skipped"
                                  ? "bg-amber-100 text-amber-800"
                                  : late
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {row.status === "Skipped" ? "Skipped" : late ? "Late" : "On time"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-500">
                            {new Date(row.finishedAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function App() {
  const [activeTool, setActiveTool] = useState(getCurrentTool);

  useEffect(() => {
    function handleRouteChange() {
      setActiveTool(getCurrentTool());
    }

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  function navigate(path) {
    window.history.pushState({}, "", path);
    setActiveTool(getCurrentTool());
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ToolNavigation activeTool={activeTool} onNavigate={navigate} />
      {activeTool === "page" ? <PageRevisionTimer /> : <GMATQuestionTimer />}
    </div>
  );
}
