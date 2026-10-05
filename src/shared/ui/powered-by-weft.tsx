import Image from "next/image";

export function PoweredByWeft() {
  return (
    <span className="powered-by-weft">
      <span>powered by</span>
      <Image src="/weft-mark.svg" alt="" width={20} height={20} />
      <strong>weft</strong>
    </span>
  );
}
