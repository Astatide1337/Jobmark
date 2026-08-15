import Image from 'next/image';
import { JOBMARK_LOGO_URL } from './brand-assets';

interface JobmarkMarkProps {
  className?: string;
  sizes?: string;
}

export function JobmarkMark({ className, sizes = '28px' }: JobmarkMarkProps) {
  return (
    <Image
      src={JOBMARK_LOGO_URL}
      alt=""
      width={28}
      height={28}
      sizes={sizes}
      unoptimized
      className={className}
    />
  );
}
