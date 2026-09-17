import Image from "next/image";

export function PartnerAvatar({
  name,
  size = 34,
  src,
}: {
  name: string;
  size?: number;
  src: string;
}) {
  return (
    <Image
      alt={`Portrait of ${name}`}
      className="partner-avatar"
      height={size}
      sizes={`${size}px`}
      src={src}
      width={size}
    />
  );
}
