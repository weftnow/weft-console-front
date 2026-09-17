import Image from "next/image";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SortIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { peopleData, statusLabels, type DirectoryPerson } from "../people-data";

export function PersonAvatar({
  person,
  size,
}: {
  person: Pick<DirectoryPerson, "avatar" | "initials" | "name">;
  size: number;
}) {
  if (!person.avatar) {
    return (
      <span aria-hidden="true" className="people-avatar people-avatar--initials">
        {person.initials}
      </span>
    );
  }

  return (
    <Image
      alt={`Portrait of ${person.name}`}
      className="people-avatar"
      height={size}
      sizes={`${size}px`}
      src={person.avatar}
      width={size}
    />
  );
}

function PersonRow({ person, selected }: { person: DirectoryPerson; selected: boolean }) {
  return (
    <tr aria-selected={selected} className={selected ? "people-row--selected" : undefined}>
      <td>
        <div className="people-identity">
          <PersonAvatar person={person} size={36} />
          <span>{person.name}</span>
        </div>
      </td>
      <td>
        <div className="people-role">
          <strong>{person.role}</strong>
          <span>{person.company}</span>
        </div>
      </td>
      <td>{person.events}</td>
      <td className="cell-muted">{person.goal}</td>
      <td>{person.valuable}</td>
      <td>
        <div className="people-next">
          <strong>{person.nextEvent.city}</strong>
          <span>{person.nextEvent.date}</span>
        </div>
      </td>
      <td>
        <span className={`people-status people-status--${person.status}`}>
          {statusLabels[person.status]}
        </span>
      </td>
    </tr>
  );
}

export function PeopleDirectory() {
  const { directory, pagination, profile } = peopleData;

  return (
    <Surface
      aria-labelledby="people-directory-title"
      as="section"
      className="panel table-panel people-directory"
      depth="raised"
    >
      <h2 className="visually-hidden" id="people-directory-title">
        People directory
      </h2>
      <div className="table-scroll">
        <table className="people-table">
          <thead>
            <tr>
              <th scope="col"><span className="sortable">Person <SortIcon height="11" width="11" /></span></th>
              <th scope="col">Role / Company</th>
              <th scope="col">Events</th>
              <th scope="col">Current goal</th>
              <th scope="col"><span className="sortable">Valuable <SortIcon height="11" width="11" /></span></th>
              <th scope="col">Next event</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody className="table-body-well" data-depth="inset">
            {directory.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                selected={person.id === profile.person.id}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>{pagination.showing}</span>
        <nav aria-label="People pagination" className="pagination">
          <TactileButton aria-label="Previous page" className="page-button" disabled>
            <ArrowLeftIcon height="15" width="15" />
          </TactileButton>
          {pagination.pages.map((page, index) => (
            <TactileButton
              aria-current={index === 0 ? "page" : undefined}
              className="page-button"
              key={page}
              variant={index === 0 ? "graphite" : "neutral"}
            >
              {page}
            </TactileButton>
          ))}
          <span aria-hidden="true" className="pagination__gap">…</span>
          <TactileButton className="page-button page-button--wide">{pagination.lastPage}</TactileButton>
          <TactileButton aria-label="Next page" className="page-button">
            <ArrowRightIcon height="15" width="15" />
          </TactileButton>
        </nav>
      </div>
    </Surface>
  );
}
