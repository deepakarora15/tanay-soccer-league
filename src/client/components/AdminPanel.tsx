import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

interface PendingRequest {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  status: string;
}

export default function AdminPanel() {
  const { apiCall } = useApi();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    apiCall<PendingRequest[]>('/api/admin/join-requests')
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await apiCall(`/api/admin/join-requests/${id}/approve`, { method: 'POST' });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {}
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setProcessing(id);
    try {
      await apiCall(`/api/admin/join-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } catch {}
    setProcessing(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🛡️ Admin Panel</h2>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Pending Join Requests
          {requests.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full">
              {requests.length}
            </span>
          )}
        </h3>

        {requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-500 dark:text-gray-400">No pending requests</p>
            <p className="text-xs text-gray-400 mt-1">Share the link with friends so they can join!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-3"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{req.displayName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{req.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Requested {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {rejectingId === req.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason"
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={processing === req.id}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={processing === req.id}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(req.id)}
                        disabled={processing === req.id}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tournament Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">🏆 Tournament</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Event</p>
            <p className="font-bold text-gray-900 dark:text-white">FIFA World Cup 2026</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-bold text-green-600 dark:text-green-400">Active</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
            <p className="font-bold text-gray-900 dark:text-white">Jun 11 - Jul 19, 2026</p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Matches</p>
            <p className="font-bold text-gray-900 dark:text-white">72 Group Stage</p>
          </div>
        </div>
      </div>
    </div>
  );
}
