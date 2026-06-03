import React from 'react';

interface TenantLogoImageProps {
  src?: string | null;
  fallbackSrc: string;
  alt: string;
  className?: string;
}

const TenantLogoImage: React.FC<TenantLogoImageProps> = ({
  src,
  fallbackSrc,
  alt,
  className,
}) => {
  const resolvedSrc = React.useMemo(() => {
    if (!src) return fallbackSrc;
    if (!src.includes('/uploads/')) return src;

    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}v=20260603`;
  }, [fallbackSrc, src]);
  const [currentSrc, setCurrentSrc] = React.useState(resolvedSrc);

  React.useEffect(() => {
    setCurrentSrc(resolvedSrc);
  }, [resolvedSrc]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
};

export default TenantLogoImage;
