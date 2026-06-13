import { useEffect, useState, useRef, ReactNode } from 'react';
import { useApi } from '../hooks/useApi';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scheduledAt: string;
  status: 'live' | 'upcoming' | 'completed';
  groupName: string | null;
}

export default function Scorecard() {
  const { apiCall } = useApi();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMatches = async () => {
    try {
      // Fetch all match types
      const [live, upcoming, completed] = await Promise.all([
        apiCall<Match[]>('/api/matches/live').catch(() => []),
        apiCall<Match[]>('/api/matches/upcoming').catch(() => []),
        apiCall<Match[]>('/api/matches/completed').catch(() => []),
      ]);
      // Combine and sort: live first, then upcoming (next 5), then completed (last 5)
      const allMatches = [
        ...live,
        ...upcoming.slice(0, 8),
        ...completed.slice(0, 5),
      ];
      setMatches(allMatches);
    } catch {}
  };

  useEffect(() => {
    fetchMatches().finally(() => setLoading(false));
    intervalRef.current = setInterval(fetchMatches, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  const live = matches.filter((m) => m.status === 'live');
  const upcoming = matches.filter((m) => m.status === 'upcoming');
  const completed = matches.filter((m) => m.status === 'completed');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📺 Live Scores</h2>

      {live.length > 0 && (
        <Section title="Live" badge={<LiveDot />}>
          {live.map((m) => <MatchCard key={m.id} match={m} />)}
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Upcoming">
          {upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
        </Section>
      )}

      {completed.length > 0 && (
        <Section title="Completed">
          {completed.map((m) => <MatchCard key={m.id} match={m} />)}
        </Section>
      )}

      {matches.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">📺</p>
          <p className="text-gray-500 dark:text-gray-400">No match data available yet.</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        {badge}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function LiveDot() {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-live-pulse"></span>
      LIVE
    </span>
  );
}

function MatchCard({ match }: { match: Match }) {
  const statusColors: Record<string, string> = {
    live: 'border-red-400 dark:border-red-600',
    upcoming: 'border-blue-300 dark:border-blue-700',
    completed: 'border-gray-200 dark:border-gray-700',
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${statusColors[match.status]} bg-white dark:bg-gray-800`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900 dark:text-white text-sm">{match.homeTeam}</span>
        <span className="text-xl font-bold text-gray-900 dark:text-white">
          {match.homeScore ?? '-'}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="font-semibold text-gray-900 dark:text-white text-sm">{match.awayTeam}</span>
        <span className="text-xl font-bold text-gray-900 dark:text-white">
          {match.awayScore ?? '-'}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(match.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="flex items-center gap-2">
          {match.groupName && <span className="text-xs text-blue-500">{match.groupName}</span>}
          <StatusBadge status={match.status} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    live: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    upcoming: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    completed: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
