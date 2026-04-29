import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  CalendarX,
  CalendarClock,
  ListChecks,
  Bell,
} from "lucide-react";
import { Button } from "../../ui/button";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../../../lib/notification";

// Phase E: real notifications feed wired to /api/notifications.

const TYPE_ICON = {
  "booking-created": CalendarPlus,
  "booking-cancelled": CalendarX,
  "booking-rescheduled": CalendarClock,
  "waitlist-confirmed": ListChecks,
  system: Bell,
};

const relTime = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await listNotifications();
      setItems(res.data?.data || []);
      setUnread(res.data?.unread || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleClick = async (item) => {
    if (item.read) return;
    // Optimistic mark-read.
    setItems((prev) =>
      prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)),
    );
    setUnread((n) => Math.max(0, n - 1));
    try {
      await markNotificationRead(item._id);
    } catch (err) {
      // Roll back on failure.
      setItems((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, read: false } : n)),
      );
      setUnread((n) => n + 1);
      toast.error(err.response?.data?.message || "Failed to mark as read");
    }
  };

  const handleMarkAll = async () => {
    if (unread === 0) return;
    try {
      setBusy(true);
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark all as read");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 bg-white rounded-lg shadow-md overflow-auto scrollbar-modern">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          Notifications{unread > 0 && (
            <span className="ml-2 text-sm font-medium text-blue-600">
              {unread} unread
            </span>
          )}
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAll}
          disabled={busy || unread === 0}
        >
          Mark all as read
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No notifications at the moment.</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.type] || Bell;
            return (
              <li
                key={item._id}
                onClick={() => handleClick(item)}
                className={`flex items-start gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${
                  item.read ? "hover:bg-gray-50" : "bg-blue-50/60 hover:bg-blue-100/60"
                }`}
              >
                <div
                  className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
                    item.read ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      item.read ? "text-gray-700" : "font-semibold text-gray-900"
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.message && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {relTime(item.createdAt)}
                  </p>
                </div>
                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
