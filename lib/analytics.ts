const ANALYTICS_KEY = "cipaca-analytics";

interface AnalyticsAggregate {
  appointmentsCompleted: number;
  emergenciesCompleted: number;
  sessionsStarted: number;
  dropOffByStep: Record<string, number>;
  totalCallDurationSeconds: number;
  callCount: number;
}

function defaultAggregate(): AnalyticsAggregate {
  return {
    appointmentsCompleted: 0,
    emergenciesCompleted: 0,
    sessionsStarted: 0,
    dropOffByStep: {},
    totalCallDurationSeconds: 0,
    callCount: 0,
  };
}

function load(): AnalyticsAggregate {
  if (typeof window === "undefined") return defaultAggregate();
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? { ...defaultAggregate(), ...(JSON.parse(raw) as AnalyticsAggregate) } : defaultAggregate();
  } catch {
    return defaultAggregate();
  }
}

function save(data: AnalyticsAggregate): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const analytics = {
  trackSessionStart(): void {
    const d = load();
    d.sessionsStarted += 1;
    save(d);
  },
  trackCompletion(type: "appointment" | "emergency"): void {
    const d = load();
    if (type === "appointment") d.appointmentsCompleted += 1;
    else d.emergenciesCompleted += 1;
    save(d);
  },
  trackDropOff(step: string): void {
    const d = load();
    d.dropOffByStep[step] = (d.dropOffByStep[step] ?? 0) + 1;
    save(d);
  },
  trackCallDuration(seconds: number): void {
    const d = load();
    d.totalCallDurationSeconds += seconds;
    d.callCount += 1;
    save(d);
  },
  get(): AnalyticsAggregate {
    return load();
  },
};

export function getAverageCallDuration(): number {
  const d = load();
  return d.callCount ? Math.round(d.totalCallDurationSeconds / d.callCount) : 0;
}
