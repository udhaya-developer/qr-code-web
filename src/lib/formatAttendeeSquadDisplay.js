/**
 * Scan UI / ID card footer: show the squad picked at registration when present.
 * When only the schema default "Guest" is stored, infer VIP vs Guest from guestType
 * (e.g. bulk import sets squad to Guest but guestType is vip).
 */
export function formatAttendeeSquadDisplay(attendee) {
  if (!attendee || typeof attendee !== 'object') return '—';

  const raw = String(attendee.squad ?? '').trim();
  const lower = raw.toLowerCase();
  const guestType = String(attendee.guestType ?? 'normal').toLowerCase();

  const isGenericPlaceholder = !raw || lower === 'guest';

  if (!isGenericPlaceholder) {
    return raw;
  }

  if (guestType === 'vip') return 'VIP';
  return 'Guest';
}
