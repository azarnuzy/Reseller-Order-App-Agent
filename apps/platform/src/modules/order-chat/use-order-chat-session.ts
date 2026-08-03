import { useCallback, useEffect, useRef, useState } from "react";
import { createOrderChatBootstrap, loadOrderChatSession } from "./order-chat-api";
import type { ChatBootstrap, StoredChatSession } from "./order-chat-types";

const ACTIVE_SESSION_KEY = "reseller-order:active-session";
const SESSION_HISTORY_KEY = "reseller-order:session-history";
const MAX_STORED_SESSIONS = 12;

type SessionState = {
  bootstrap?: ChatBootstrap;
  error?: string;
  loading: boolean;
};

export function useOrderChatSession() {
  const [sessions, setSessions] = useState<StoredChatSession[]>(readStoredSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() =>
    readStorage(ACTIVE_SESSION_KEY),
  );
  const [sessionToLoad, setSessionToLoad] = useState<string | null>(() =>
    readStorage(ACTIVE_SESSION_KEY),
  );
  const [conversationKey, setConversationKey] = useState(
    () => readStorage(ACTIVE_SESSION_KEY) ?? createClientConversationKey(),
  );
  const [state, setState] = useState<SessionState>(() => ({
    loading: Boolean(readStorage(ACTIVE_SESSION_KEY)),
  }));
  const pendingCreation = useRef<Promise<string> | null>(null);

  useEffect(() => {
    if (!sessionToLoad) {
      setState({ loading: false });
      return;
    }

    let active = true;
    setState({ loading: true });

    void loadOrderChatSession(sessionToLoad)
      .then((result) => {
        if (!active) return;
        rememberSession(result.session.id, setSessions);
        setState({ bootstrap: result, loading: false });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          error: error instanceof Error ? error.message : "The conversation could not be loaded.",
          loading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [sessionToLoad]);

  const startNewConversation = useCallback(() => {
    pendingCreation.current = null;
    removeStorage(ACTIVE_SESSION_KEY);
    setActiveSessionId(null);
    setSessionToLoad(null);
    setConversationKey(createClientConversationKey());
    setState({ loading: false });
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    writeStorage(ACTIVE_SESSION_KEY, sessionId);
    setConversationKey(sessionId);
    setActiveSessionId(sessionId);
    setSessionToLoad(sessionId);
  }, []);

  const ensureSession = useCallback(
    async (firstMessage: string) => {
      if (activeSessionId) {
        return activeSessionId;
      }

      if (pendingCreation.current) {
        return pendingCreation.current;
      }

      const creation = createOrderChatBootstrap()
        .then((result) => {
          const sessionId = result.session.id;
          writeStorage(ACTIVE_SESSION_KEY, sessionId);
          rememberSession(sessionId, setSessions, sessionTitle(firstMessage));
          setState({ bootstrap: result, loading: false });
          setActiveSessionId(sessionId);
          return sessionId;
        })
        .finally(() => {
          pendingCreation.current = null;
        });

      pendingCreation.current = creation;
      return creation;
    },
    [activeSessionId],
  );

  const nameSessionFromMessage = useCallback((sessionId: string, message: string) => {
    setSessions((current) => {
      const next = current.map((session) =>
        session.id === sessionId && session.title === "New conversation"
          ? { ...session, title: sessionTitle(message) }
          : session,
      );
      storeSessions(next);
      return next;
    });
  }, []);

  return {
    ...state,
    activeSessionId,
    conversationKey,
    ensureSession,
    nameSessionFromMessage,
    selectSession,
    sessions,
    startNewConversation,
  };
}

function rememberSession(
  sessionId: string,
  setSessions: React.Dispatch<React.SetStateAction<StoredChatSession[]>>,
  title = "New conversation",
) {
  setSessions((current) => {
    const existing = current.find((session) => session.id === sessionId);
    const next = [
      existing ?? {
        createdAt: new Date().toISOString(),
        id: sessionId,
        title,
      },
      ...current.filter((session) => session.id !== sessionId),
    ].slice(0, MAX_STORED_SESSIONS);

    storeSessions(next);
    return next;
  });
}

function sessionTitle(message: string) {
  return message.trim().replace(/\s+/g, " ").slice(0, 46) || "New conversation";
}

function createClientConversationKey() {
  return `new:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

function readStoredSessions(): StoredChatSession[] {
  const raw = readStorage(SESSION_HISTORY_KEY);
  if (!raw) return [];

  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value)
      ? value.filter(isStoredChatSession).slice(0, MAX_STORED_SESSIONS)
      : [];
  } catch {
    return [];
  }
}

function isStoredChatSession(value: unknown): value is StoredChatSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredChatSession>;
  return (
    typeof session.createdAt === "string" &&
    typeof session.id === "string" &&
    typeof session.title === "string"
  );
}

function storeSessions(sessions: StoredChatSession[]) {
  writeStorage(SESSION_HISTORY_KEY, JSON.stringify(sessions));
}

function readStorage(key: string) {
  return typeof window === "undefined" ? null : window.localStorage.getItem(key);
}

function writeStorage(key: string, value: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, value);
}

function removeStorage(key: string) {
  if (typeof window !== "undefined") window.localStorage.removeItem(key);
}
