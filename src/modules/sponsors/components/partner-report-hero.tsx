import { CityArtwork } from "@/shared/ui/city-artwork";
import { ChevronDownIcon, DownloadIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { partnerReportData } from "../partner-report-data";
import { PartnerMark } from "./partner-mark";

export function PartnerReportHero() {
  const { event, partner } = partnerReportData;

  return (
    <Surface
      aria-labelledby="partner-report-title"
      as="section"
      className="partner-hero"
      depth="raised"
    >
      <CityArtwork art={event.art} className="partner-hero__art city-art--cinematic" eager>
        <span className="live-badge"><span /> Live</span>
        <span className="city-art__scrim" />
        <span className="city-art__caption">
          <strong>{event.city}</strong>
          <span>{event.edition}</span>
          <em>{event.dates} &nbsp;·&nbsp; {event.location}</em>
        </span>
      </CityArtwork>
      <div className="partner-hero__identity">
        <p className="partner-hero__label">Partner</p>
        <div className="partner-hero__wordmark">
          <PartnerMark size={54} />
          <h1 id="partner-report-title">
            {partner.wordmark.map((line) => <span key={line}>{line}</span>)}
          </h1>
        </div>
        <p className="partner-hero__principles">{partner.principles}</p>
      </div>
      <p className="partner-hero__promise">
        {partner.promise.map((line) => <span key={line}>{line}</span>)}
      </p>
      <TactileButton className="partner-hero__download" variant="graphite">
        <DownloadIcon height="17" width="17" />
        Download report
        <ChevronDownIcon height="15" width="15" />
      </TactileButton>
    </Surface>
  );
}
