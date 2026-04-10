'use client';

import { useState, useEffect } from 'react';

interface NotificationEntry {
  type: 'comment' | 'assessment_submitted';
  companyId: string;
  companyName?: string;
  taskId?: string;
  authorName?: string;
  commentPreview?: string;
  assessmentName?: string;
  createdAt: string;
}

interface NotificationsPageProps {
  searchParams: { token?: string };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function NotificationCard({ entry, token }: { entry: NotificationEntry; token: string }) {
  const dashboardUrl = `/internal?token=${encodeURIComponent(token)}`;

  const isComment = entry.type === 'comment';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: isComment ? '#e8f0fb' : '#edf7ed' }}
          >
            {isComment ? (
              <svg className="w-4 h-4" fill="none" stroke="#174887" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="#15803d" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isComment ? '#e8f0fb' : '#edf7ed',
                  color: isComment ? '#174887' : '#15803d',
                }}
              >
                {isComment ? 'Customer Comment' : 'Assessment Submitted'}
              </span>
              {entry.companyName && (
                <span className="text-sm font-semibold text-gray-800">{entry.companyName}</span>
              )}
            </div>

            {isComment ? (
              <>
                {entry.authorName && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">{entry.authorName}</span> left a comment
                    {entry.taskId && (
                      <span className="text-gray-400 text-xs ml-1">(task {entry.taskId})</span>
                    )}
                  </p>
                )}
                {entry.commentPreview && (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 italic">
                    &ldquo;{entry.commentPreview}&rdquo;
                  </p>
                )}
              </>
            ) : (
              <>
                {entry.assessmentName && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{entry.assessmentName}</span> has been submitted.
                    Work orders have been created in ClickUp.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Date + link */}
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-400 mb-2 whitespace-nowrap">{formatDate(entry.createdAt)}</p>
          <a
            href={dashboardUrl}
            className="text-xs font-semibold text-[#174887] hover:underline whitespace-nowrap"
          >
            Open dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : null;
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`/api/notifications?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#174887' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">Recent activity from your customers</p>
          </div>
        </div>

        {!token ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No session token — open this page from the Copilot dashboard.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <svg className="w-7 h-7 animate-spin text-[#174887]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm font-medium">No notifications yet.</p>
            <p className="text-xs mt-1">Customer comments and assessment submissions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((entry, i) => (
              <NotificationCard key={i} entry={entry} token={token} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
