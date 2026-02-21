'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const STORAGE_KEY = 'sentence-from-words-output';

type AgentCommentContextValue = {
  agentComment: string;
  setAgentComment: (s: string) => void;
  appendAgentComment: (s: string) => void;
  clearAgentComment: () => void;
};

const AgentCommentContext = createContext<AgentCommentContextValue | null>(
  null,
);

export function useAgentComment(): AgentCommentContextValue {
  const ctx = useContext(AgentCommentContext);
  if (!ctx) {
    return {
      agentComment: '',
      setAgentComment: () => {},
      appendAgentComment: () => {},
      clearAgentComment: () => {},
    };
  }
  return ctx;
}

export function AgentCommentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [agentComment, setAgentCommentState] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        queueMicrotask(() => setAgentCommentState(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const setAgentComment = useCallback((s: string) => {
    setAgentCommentState(s);
  }, []);

  const appendAgentComment = useCallback((s: string) => {
    setAgentCommentState((prev) => prev + s);
  }, []);

  const clearAgentComment = useCallback(() => {
    setAgentCommentState('');
  }, []);

  const value: AgentCommentContextValue = {
    agentComment,
    setAgentComment,
    appendAgentComment,
    clearAgentComment,
  };

  return (
    <AgentCommentContext.Provider value={value}>
      {children}
    </AgentCommentContext.Provider>
  );
}
