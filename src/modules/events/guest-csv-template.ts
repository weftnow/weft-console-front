/** Shared template used by both initial event setup and later roster imports. */
export const GUEST_CSV_TEMPLATE = [
  "First Name,Last Name,Email,Phone,Company,Position,LinkedIn,Profile Type,Guest Type",
  "Ada,Whitfield,ada.whitfield@example.com,+1 702 555 0101,Northline Labs,Founder & CEO,linkedin.com/in/ada-whitfield,Founders,VIP",
  "Tomas,Okonkwo,tomas.okonkwo@example.com,+1 415 555 0102,Arbor Peak Capital,Partner,linkedin.com/in/tomas-okonkwo,Investors,Attendee",
  "Mira,Lindqvist,mira.lindqvist@example.com,+1 212 555 0103,Ardent Global Bank,Head of Sponsorships,linkedin.com/in/mira-lindqvist,Sponsors,Sponsor",
].join("\n");

export function downloadGuestCsvTemplate() {
  const url = URL.createObjectURL(new Blob([GUEST_CSV_TEMPLATE], { type: "text/csv" }));
  const link = document.createElement("a");
  link.download = "weft-attendee-template.csv";
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
