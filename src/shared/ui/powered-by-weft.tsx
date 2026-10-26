import Image from "next/image";
import { getI18n } from "@/shared/i18n/get-locale";

export async function PoweredByWeft() {
  const { dict } = await getI18n();
  return (
    <span className="powered-by-weft">
      <span>{dict.common.poweredBy}</span>
      <Image src="/weft-mark.svg" alt="" width={20} height={20} />
      <strong>weft</strong>
    </span>
  );
}
