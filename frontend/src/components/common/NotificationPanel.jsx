import React, { useState } from 'react';
import { Bell, Check, X, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n-1',
    title: 'Work Crew Dispatched',
    message: 'Cold-mix asphalt patch crew deployed for report CF-2026-0891 on ORR Service Rd.',
    timestamp: '2026-10-15T14:15:00Z',
    type: 'success',
    isRead: false,
  },
  {
    id: 'n-2',
    title: 'Critical Infrastructure Alert',
    message: 'Major water pipeline rupture reported in Indiranagar (CF-2026-0904). Triage required.',
    timestamp: '2026-10-16T06:20:00Z',
    type: 'warning',
    isRead: false,
  },
  {
    id: 'n-3',
    title: 'Status Verified Resolved',
    message: 'Streetlighting restored on Sarjapur Link Access Road (CF-2026-0775).',
    timestamp: '2026-10-11T20:10:00Z',
    type: 'info',
    isRead: true,
  },
];

/**
 * NotificationPanel
 * Flyout notification menu for municipal updates and status alerts.
 */
export default function NotificationPanel({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="absolute right-0 top-12 w-80 sm:w-96 bg-[#FFFDF9] rounded-2xl border border-[#E5DAC4] shadow-xl z-50 overflow-hidden text-left animate-fadeIn"
    >
      <div className="flex items-center justify-between p-3.5 border-b border-[#EBE3D0] bg-[#FAF5EC]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-700" />
          <h4 className="text-xs font-bold text-stone-900">Municipal Notifications</h4>
          {unreadCount > 0 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-0.5"
            aria-label="Close notifications"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-[#F0E8D8]">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-600 font-medium">No new notifications.</div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-3 text-xs transition-colors relative flex items-start gap-3 ${
                item.isRead ? 'bg-[#FFFDF9]' : 'bg-[#FAF6EE]/80'
              }`}
            >
              <div className="mt-0.5">
                {item.type === 'warning' ? (
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                ) : item.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Clock className="w-4 h-4 text-teal-600" />
                )}
              </div>

              <div className="flex-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-stone-900">{item.title}</span>
                  {!item.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  )}
                </div>
                <p className="text-stone-700 text-[11.5px] mt-0.5 leading-snug">{item.message}</p>
                <span className="text-[10px] text-stone-600 font-medium block mt-1">
                  {formatDate(item.timestamp)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => removeNotification(item.id)}
                className="text-stone-400 hover:text-stone-700 transition-colors focus-visible:ring-1 focus-visible:ring-emerald-600 rounded p-0.5"
                aria-label={`Dismiss notification: ${item.title}`}
                title="Dismiss"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-2.5 bg-[#FAF5EC] border-t border-[#EBE3D0] text-center">
        <span className="text-[10px] text-stone-600 font-medium">
          Authoritative real-time notifications via WebSocket / SSE when connected.
        </span>
      </div>
    </div>
  );
}
