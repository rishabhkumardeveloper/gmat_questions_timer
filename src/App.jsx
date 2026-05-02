import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SECONDS = 135;
const DEFAULT_QUESTIONS = 31;

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
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

export default function GMATQuestionTimer() {
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
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-8">
      <main className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.25fr_0.75fr]">
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
    </div>
  );
}
