import type { Gender, Orientation, ReportReason } from '@/types/domain';

export const genderLabels: Record<Gender, string> = {
  woman: 'Woman',
  man: 'Man',
  nonbinary: 'Nonbinary',
};

export const interestedInLabels: Record<Gender, string> = {
  woman: 'Women',
  man: 'Men',
  nonbinary: 'Nonbinary people',
};

export const orientationLabels: Record<Orientation, string> = {
  straight: 'Straight',
  gay: 'Gay',
  lesbian: 'Lesbian',
  bisexual: 'Bisexual',
  queer: 'Queer',
  pansexual: 'Pansexual',
  asexual: 'Asexual',
  prefer_not_to_say: 'Prefer not to say',
};

export const reportReasonLabels: Record<ReportReason, { title: string; hint: string }> = {
  fake_profile: { title: 'Fake profile or impersonation', hint: 'Photos or details that aren’t theirs' },
  inappropriate_content: { title: 'Inappropriate photos or text', hint: 'Nudity, hate, or graphic content' },
  harassment: { title: 'Harassment or threats', hint: 'Messages that are abusive or intimidating' },
  scam_or_spam: { title: 'Scam or spam', hint: 'Asking for money, links, or off-app contact' },
  underage: { title: 'May be under 18', hint: 'We take this seriously and review quickly' },
  safety_concern: { title: 'Offline safety concern', hint: 'Something happened when you met' },
  other: { title: 'Something else', hint: 'Tell us in the details' },
};

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
