import React from "react";

export default function NotificationsPage({ notifications = [] }) {
  return (
    <div className="flex flex-col h-full p-6 bg-white rounded-lg shadow-md overflow-auto scrollbar-modern">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>

      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications at the moment.</p>
      ) : (
        <ul className="divide-y">
          {notifications.map((item, index) => (
            <li
              key={index}
              className="px-4 py-3 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
            >
              <p className="text-sm font-semibold text-gray-800">
                {item.title}
              </p>
              <p className="text-xs text-gray-500 mt-1">{item.message}</p>
              <p className="text-xs text-gray-400 mt-1">{item.time}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
