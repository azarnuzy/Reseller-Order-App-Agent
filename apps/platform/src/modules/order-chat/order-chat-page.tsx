import { Button } from "@repo/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { BotIcon, MenuIcon, MoreVerticalIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { HeaderControls } from "../app-shell/header-controls";
import { currentUserQueryOptions } from "../profile/hooks/use-profile";
import { ConversationSidebar } from "./components/conversation-sidebar";
import { OrderChatConversation } from "./components/order-chat-conversation";
import { useOrderChatSession } from "./use-order-chat-session";

export function OrderChatPage() {
  const user = useQuery(currentUserQueryOptions);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const {
    activeSessionId,
    bootstrap,
    conversationKey,
    ensureSession,
    error,
    loading,
    nameSessionFromMessage,
    selectSession,
    sessions,
    startNewConversation,
  } = useOrderChatSession();

  if (!user.data) {
    return null;
  }

  return (
    <div className="order-app-frame">
      <ConversationSidebar
        activeSessionId={activeSessionId}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onNewConversation={startNewConversation}
        onSelectSession={selectSession}
        sessions={sessions}
        user={user.data}
      />
      <main className="order-chat-main">
        <header className="order-chat-header">
          <button
            aria-label="Open conversation menu"
            className="order-mobile-menu"
            onClick={() => setMobileSidebarOpen(true)}
            type="button"
          >
            <MenuIcon className="size-5" />
          </button>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <BotIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-slate-950">Shopping Agent</h1>
            <p className="flex items-center gap-2 truncate text-sm text-slate-500">
              <span className="size-2 rounded-full bg-emerald-500" /> Reseller Order Agent
            </p>
          </div>
          <span className="hidden rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 sm:inline-flex">
            USD
          </span>
          <HeaderControls />
          <button
            aria-label="More options"
            className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            type="button"
          >
            <MoreVerticalIcon className="size-5" />
          </button>
        </header>

        <section className="order-chat-surface">
          {loading ? (
            <div className="grid h-full place-items-center">
              <div className="grid place-items-center text-center text-slate-500">
                <RefreshCwIcon className="size-6 animate-spin text-blue-600" />
                <p className="mt-3 text-sm">Restoring your conversation…</p>
              </div>
            </div>
          ) : error ? (
            <div className="grid h-full place-items-center px-6 text-center">
              <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                <p className="font-semibold text-slate-950">Conversation unavailable</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {error ?? "The conversation could not be loaded."}
                </p>
                <Button
                  className="mt-5 bg-blue-600 text-white hover:bg-blue-700"
                  onClick={startNewConversation}
                  type="button"
                >
                  Start a new conversation
                </Button>
              </div>
            </div>
          ) : (
            <OrderChatConversation
              bootstrap={bootstrap}
              key={conversationKey}
              onEnsureSession={ensureSession}
              onSessionMessage={nameSessionFromMessage}
            />
          )}
        </section>
      </main>
    </div>
  );
}
