import { useState } from 'react';
import { Sprout } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel = 'Botanical Specimen',
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#131E1A] via-[#0F1714] to-[#0A0F0D] text-[#6E8479] p-4 text-center ${className}`}
      >
        <Sprout className="w-7 h-7 text-emerald-400/60 mb-2" />
        <span className="text-xs font-medium text-[#8FA399] max-w-[16ch] truncate">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
