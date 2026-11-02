import { Redirect } from 'expo-router';
import { useSessionStore } from '@/state/session';

/** Always-available entry point. Guards fall back here when the session changes. */
export default function Index() {
  const signedIn = useSessionStore((s) => s.session !== null);
  const hasProfile = useSessionStore((s) => s.hasProfile);
  if (!signedIn) return <Redirect href="/welcome" />;
  if (!hasProfile) return <Redirect href="/details" />;
  return <Redirect href="/discover" />;
}
