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
  const resolvedSrc = src || fallbackSrc;
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
