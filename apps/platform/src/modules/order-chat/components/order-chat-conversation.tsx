import {
  createChatTransport,
  type UIMessage,
  type UIMessagePart,
  type UIStreamEvent,
  type UIStreamRequest,
  useChat,
} from "@anvia/react";
import { ChatProvider, Composer, Message, Thread } from "@anvia/react-ui";
import { AlertCircleIcon, BotIcon, ChevronDownIcon, LoaderCircleIcon, SendIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatBootstrap } from "../order-chat-types";
import { orderChatApiBaseUrl } from "../order-chat-api";
import { ToolResultCard } from "./tool-result-card";

type OrderChatConversationProps = {
  bootstrap?: ChatBootstrap;
  onEnsureSession: (firstMessage: string) => Promise<string>;
  onSessionMessage: (sessionId: string, message: string) => void;
};

const suggestions = [
  {
    id: "browse",
    label: "Browse available products",
    prompt: "Show me products I can order, sorted by lowest price.",
  },
  {
    id: "popular",
    label: "See popular products",
    prompt: "What are the most popular products available right now?",
  },
  {
    id: "draft",
    label: "Review my draft",
    prompt: "Show me my current order draft.",
  },
];

export function OrderChatConversation({
  bootstrap,
  onEnsureSession,
  onSessionMessage,
}: OrderChatConversationProps) {
  const [input, setInput] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string>();
  const inputRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(bootstrap?.session.id ?? null);
  const transport = useMemo(
    () =>
      createChatTransport<UIStreamRequest, UIStreamEvent>({
        endpoint: () => {
          if (!sessionIdRef.current) {
            throw new Error("A conversation must be created before sending a message.");
          }
          return `${orderChatApiBaseUrl}/api/chat/sessions/${encodeURIComponent(
            sessionIdRef.current,
          )}/messages`;
        },
        format: "jsonl",
      }),
    [],
  );
  const chat = useChat({
    initialMessages: bootstrap?.initialMessages ?? [],
    suggestions,
    transport,
  });
  const streaming = chat.status === "streaming";
  const busy = streaming || creatingSession;

  useEffect(() => {
    sessionIdRef.current = bootstrap?.session.id ?? sessionIdRef.current;
  }, [bootstrap?.session.id]);

  async function submitMessage(message: string, clear?: () => void) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;

    setCreatingSession(true);
    setSessionError(undefined);
    try {
      const sessionId = sessionIdRef.current ?? (await onEnsureSession(trimmed));
      sessionIdRef.current = sessionId;
      onSessionMessage(sessionId, trimmed);
      clear?.();
      await chat.sendMessage(trimmed);
    } catch (error) {
      setSessionError(
        error instanceof Error ? error.message : "The conversation could not be created.",
      );
    } finally {
      setCreatingSession(false);
    }
  }

  function queueMessage(message: string) {
    if (busy) {
      return;
    }

    setInput(message);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <ChatProvider controller={chat}>
      <Thread.Root className="order-thread-root">
        <Thread.Viewport autoScroll className="order-thread-viewport">
          <Thread.Empty className="order-chat-empty">
            <span className="grid size-16 place-items-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/20">
              <BotIcon className="size-8" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-slate-950">What would you like to order?</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Search the live catalog, compare products, and complete a verified reseller order in
              one conversation.
            </p>
            <Thread.Suggestions className="mt-6 flex flex-wrap justify-center gap-2">
              {(suggestion) => (
                <button
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                  disabled={busy}
                  onClick={() => void submitMessage(suggestion.prompt)}
                  type="button"
                >
                  {suggestion.label}
                </button>
              )}
            </Thread.Suggestions>
          </Thread.Empty>

          <Thread.Messages className="order-message-list">
            {(message) => {
              const messageIndex = chat.messages.findIndex((item) => item.id === message.id);

              if (!shouldRenderMessage(chat.messages, messageIndex)) {
                return null;
              }

              return (
                <Message.Root className={`order-message-row is-${message.role}`}>
                  {message.role === "assistant" ? (
                    <span className="order-assistant-avatar" aria-hidden="true">
                      <BotIcon className="size-4" />
                    </span>
                  ) : null}
                  <Message.Content className="order-message-content">
                    <Message.Parts
                      className="grid gap-3"
                      stream={{
                        flushImmediately: chat.status === "error",
                        isStreaming:
                          streaming &&
                          message.role === "assistant" &&
                          chat.messages.at(-1)?.id === message.id,
                        resetKey: message.id,
                      }}
                    >
                      {(part) => {
                      if (part.type === "text") {
                        return (
                          <Message.Markdown
                            className="order-message-markdown"
                            components={{
                              a: ({ children, ...props }) => (
                                <a {...props} rel="noreferrer" target="_blank">
                                  {children}
                                </a>
                              ),
                            }}
                          />
                        );
                      }

                      if (part.type === "tool") {
                        if (!shouldRenderToolPart(chat.messages, messageIndex, part)) {
                          return null;
                        }

                        return (
                          <ToolResultCard
                            disabled={busy}
                            onQueueMessage={queueMessage}
                            part={part}
                          />
                        );
                      }

                      if (part.type === "error") {
                        return (
                          <div className="order-inline-error" role="alert">
                            <AlertCircleIcon className="size-4" /> {part.error.message}
                          </div>
                        );
                      }

                      return null;
                      }}
                    </Message.Parts>
                  </Message.Content>
                </Message.Root>
              );
            }}
          </Thread.Messages>

          <Thread.Loading className="order-streaming-indicator">
            <span className="order-assistant-avatar" aria-hidden="true">
              <BotIcon className="size-4" />
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              <LoaderCircleIcon className="size-4 animate-spin text-blue-600" /> Thinking…
            </span>
          </Thread.Loading>

          <Thread.Error className="order-stream-error">
            {(error) => (
              <>
                <AlertCircleIcon className="size-5 shrink-0" />
                <div>
                  <p className="font-semibold">The connection was interrupted</p>
                  <p className="text-sm opacity-80">{readErrorMessage(error)}</p>
                </div>
              </>
            )}
          </Thread.Error>

          {sessionError ? (
            <div className="order-stream-error" role="alert">
              <AlertCircleIcon className="size-5 shrink-0" />
              <div>
                <p className="font-semibold">The conversation could not be started</p>
                <p className="text-sm opacity-80">{sessionError}</p>
              </div>
            </div>
          ) : null}

          <Thread.ScrollToBottom
            aria-label="Jump to latest message"
            className="order-scroll-button"
          >
            <ChevronDownIcon className="size-5" />
          </Thread.ScrollToBottom>
        </Thread.Viewport>

        <Thread.ViewportFooter className="order-composer-dock">
          <Composer.Root
            className="order-composer"
            input={input}
            onInputChange={setInput}
            submitMessage={({ clear, input: message }) => void submitMessage(message, clear)}
          >
            <Composer.Input
              aria-label="Message the shopping agent"
              className="order-composer-input"
              disabled={busy}
              maxRows={6}
              placeholder="Type your message…"
              ref={inputRef}
            />
            {streaming ? (
              <Composer.Stop aria-label="Stop response" className="order-send-button is-stop">
                <span className="size-3 rounded-sm bg-current" />
              </Composer.Stop>
            ) : (
              <Composer.Submit
                aria-label="Send message"
                className="order-send-button"
                disabled={busy || !input.trim()}
              >
                {creatingSession ? (
                  <LoaderCircleIcon className="size-5 animate-spin" />
                ) : (
                  <SendIcon className="size-5" />
                )}
              </Composer.Submit>
            )}
          </Composer.Root>
          <p className="mt-2 text-center text-xs text-slate-500">
            Enter to send · Shift+Enter for a new line
          </p>
        </Thread.ViewportFooter>
      </Thread.Root>
    </ChatProvider>
  );
}

type ToolMessagePart = Extract<UIMessagePart, { type: "tool" }>;

function shouldRenderMessage(messages: UIMessage[], messageIndex: number) {
  const message = messages[messageIndex];
  if (!message) return false;

  return message.parts.some((part) => {
    if (part.type === "text" || part.type === "error") return true;
    return part.type === "tool" && shouldRenderToolPart(messages, messageIndex, part);
  });
}

function shouldRenderToolPart(
  messages: UIMessage[],
  messageIndex: number,
  part: ToolMessagePart,
) {
  const toolsInTurn = getToolsInTurn(messages, messageIndex);

  // Reading a draft is an internal prerequisite for validation. When both happen
  // in one user turn, only the validation UI should be shown to avoid presenting
  // two competing actions (and, previously, two recipient forms).
  if (
    part.toolName === "getActiveDraft" &&
    toolsInTurn.some((candidate) => candidate.toolName === "validateDraft")
  ) {
    return false;
  }

  // A model may validate more than once in a single turn. Keep only the latest
  // result so each recipient-information step owns exactly one form.
  if (part.toolName === "validateDraft") {
    const latestValidation = toolsInTurn.findLast(
      (candidate) => candidate.toolName === "validateDraft",
    );
    return latestValidation?.toolCallId === part.toolCallId;
  }

  return true;
}

function getToolsInTurn(messages: UIMessage[], messageIndex: number) {
  let start = messageIndex;
  while (start >= 0 && messages[start]?.role !== "user") start -= 1;

  let end = messageIndex + 1;
  while (end < messages.length && messages[end]?.role !== "user") end += 1;

  return messages
    .slice(start + 1, end)
    .flatMap((message) =>
      message.parts.filter((part): part is ToolMessagePart => part.type === "tool"),
    );
}

function readErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Please check your connection and send the message again.";
}
