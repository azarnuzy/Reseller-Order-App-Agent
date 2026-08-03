import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
  MessageSquareTextIcon,
  PlusIcon,
  ShoppingBagIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import type { ProfileUser } from "../../profile/types";
import type { StoredChatSession } from "../order-chat-types";

type ConversationSidebarProps = {
  activeSessionId: string | null;
  mobileOpen: boolean;
  onClose: () => void;
  onNewConversation: () => void;
  onSelectSession: (sessionId: string) => void;
  sessions: StoredChatSession[];
  user: ProfileUser;
};

export function ConversationSidebar({
  activeSessionId,
  mobileOpen,
  onClose,
  onNewConversation,
  onSelectSession,
  sessions,
  user,
}: ConversationSidebarProps) {
  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Close conversation menu"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}
      <aside className={`order-chat-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/15 px-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-950/30 ring-2 ring-blue-400/30">
            <ShoppingBagIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-white">Shopping Agent</p>
            <p className="truncate text-sm text-slate-400">Reseller order assistant</p>
          </div>
          <button
            aria-label="Close conversation menu"
            className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
            type="button"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="border-b border-white/10 p-4">
          <Button
            className="h-12 w-full justify-start rounded-xl bg-white/10 text-base text-white hover:bg-white/15"
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            type="button"
          >
            <PlusIcon className="size-5" /> New conversation
          </Button>
        </div>

        <nav aria-label="Conversation history" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {sessions.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <button
                className={`order-session-item ${active ? "is-active" : ""}`}
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  onClose();
                }}
                type="button"
              >
                <MessageSquareTextIcon className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium">{session.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {formatSessionDate(session.createdAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/15 p-4">
          <div className="rounded-2xl border border-white/25 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="size-2 rounded-full bg-emerald-400" />
              Assistant ready
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Prices, stock, quantity rules, and totals are always verified by the server.
            </p>
          </div>
          <Link
            className="mt-3 flex items-center gap-3 rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            to="/profile"
          >
            <Avatar className="size-9 rounded-lg">
              {user.image ? <AvatarImage alt={`${user.name} avatar`} src={user.image} /> : null}
              <AvatarFallback className="rounded-lg bg-blue-600 text-xs text-white">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block truncate text-xs text-slate-500">Edit shared profile</span>
            </span>
            <UserRoundIcon className="size-4" />
          </Link>
        </div>
      </aside>
    </>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatSessionDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}
