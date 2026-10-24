import "server-only";
import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "@/modules/events/event-schemas";
import * as eventRepository from "@/modules/events/server/repository";
import * as profileRepository from "@/modules/attendees/server/profile-repository";
import { requireEventCreator } from "@/modules/organizations/service";
import { toMatchDetail, toMatchSummary, type ProfileFields } from "../match-dtos";
import type { IntroductionPath, MatchDetailDto, MatchListDto, MatchStatus } from "../matches-schemas";
import * as repository from "./match-repository";
import { syncEventMatches } from "./match-sync-service";

type Dependencies = {
  findOrganizationId: typeof eventRepository.findOrganizationId;
  requireCreator: typeof requireEventCreator;
  sync: typeof syncEventMatches;
  listMatches: typeof repository.listEventMatches;
  findMatch: typeof repository.findEventMatch;
  findProfile: typeof profileRepository.findProfile;
};
const defaults: Dependencies = {
  findOrganizationId: eventRepository.findOrganizationId,
  requireCreator: requireEventCreator,
  sync: syncEventMatches,
  listMatches: repository.listEventMatches,
  findMatch: repository.findEventMatch,
  findProfile: profileRepository.findProfile,
};

/** Owners and Organizers of the event's organization only. Nothing is read or requested for anyone else. */
async function authorize(userId: string, eventId: string, dependencies: Dependencies): Promise<string> {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  const organizationId = await dependencies.findOrganizationId(eventId);
  if (!organizationId) throw new ApplicationError("NOT_FOUND", "Event not found.");
  await dependencies.requireCreator({ userId, organizationId });
  return organizationId;
}

/** Pulls the engine feed first, then lists stored matches whether or not the engine answered. */
export async function listMatches(
  { userId, eventId, status, introductionPath, search = "", page = 1 }: { userId: string; eventId: string; status?: MatchStatus; introductionPath?: IntroductionPath; search?: string; page?: number },
  dependencies: Dependencies = defaults,
): Promise<MatchListDto> {
  const organizationId = await authorize(userId, eventId, dependencies);
  const sync = await dependencies.sync({ organizationId, eventId });
  const filters = { status, introductionPath, search, page };
  const hasBrowsingFilters = Boolean(introductionPath || search || page !== 1);
  const { rows, guests, counts, pagination } = await dependencies.listMatches(eventId, hasBrowsingFilters ? filters : status);
  const matches = rows.flatMap((row) => {
    const low = guests.get(row.guestLowId);
    const high = guests.get(row.guestHighId);
    return low && high ? [toMatchSummary(row, low, high)] : [];
  });
  return { matches, counts, pagination: pagination ?? { page: 1, pageSize: 25, total: matches.length }, sync };
}

function profileFields(found: Awaited<ReturnType<typeof profileRepository.findProfile>>): ProfileFields | null {
  if (!found || found.profile.version === 0) return null;
  const { summary, goals, offers, desiredConnections, background } = found.profile.fields;
  return { summary, goals, offers, desiredConnections, background };
}

export async function getMatch(
  { userId, eventId, matchId }: { userId: string; eventId: string; matchId: string },
  dependencies: Dependencies = defaults,
): Promise<MatchDetailDto> {
  await authorize(userId, eventId, dependencies);
  if (!uuidSchema.safeParse(matchId).success) throw new ApplicationError("NOT_FOUND", "Match not found.");
  const found = await dependencies.findMatch(eventId, matchId);
  const low = found?.guests.get(found.match.guestLowId);
  const high = found?.guests.get(found.match.guestHighId);
  if (!found || !low || !high) throw new ApplicationError("NOT_FOUND", "Match not found.");
  const [lowProfile, highProfile] = await Promise.all([
    dependencies.findProfile({ eventId, guestId: low.id }), dependencies.findProfile({ eventId, guestId: high.id }),
  ]);
  return toMatchDetail({
    row: found.match, low, high,
    profiles: { low: profileFields(lowProfile), high: profileFields(highProfile) },
    restrictions: found.restrictions.map((r) => ({ guestId: r.guestId, otherGuest: found.guests.get(r.otherGuestId) ?? null, reason: r.reason })),
    earlier: found.earlier.map(({ row, member }) => {
      // The other guest is the row member that is not the pair guest (or a guest linked to them).
      const otherId = row.guestLowId === member || found.guests.get(row.guestLowId)?.personId === found.guests.get(member)?.personId ? row.guestHighId : row.guestLowId;
      return { row, guestId: member, otherGuest: found.guests.get(otherId) ?? null };
    }),
  });
}
