export interface Session {
  id: string;
  date: string;
  duration: number;
  eyeAccuracy: number;
  touchAccuracy: number;
  combinedAccuracy: number;
}

const STORAGE_KEY = "zentrack_sessions";

export function getSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

export function saveSession(session: Omit<Session, "id" | "date">): Session {
  const entry: Session = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    ...session,
  };
  try {
    const sessions = getSessions();
    sessions.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage may be unavailable in private browsing
  }
  return entry;
}

export function clearSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
