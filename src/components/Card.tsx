import React from 'react';

type CardProps = {
  title?: string;
  subtitle?: string;
  image?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

const Card: React.FC<CardProps> = ({ title, subtitle, image, children, footer, className = '', onClick }) => {
  const clickableClass = onClick ? 'cursor-pointer' : '';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 10;
    const rotateX = (0.5 - py) * 8;

    e.currentTarget.style.setProperty('--card-rx', `${rotateX.toFixed(2)}deg`);
    e.currentTarget.style.setProperty('--card-ry', `${rotateY.toFixed(2)}deg`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--card-rx', '0deg');
    e.currentTarget.style.setProperty('--card-ry', '0deg');
  };

  return (
    <div className={`card-3d ${className}`}>
      <div
        className={`card-inner glass-card ${clickableClass}`}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {image && (
          <div className="h-48 bg-cover bg-center overflow-hidden rounded-t-lg">
            <a href={image} target="_blank" rel="noreferrer">
              <img src={image} alt={title || 'card-image'} className="w-full h-full object-cover" />
            </a>
          </div>
        )}
        <div className="p-4">
          {title && <h3 className="text-lg font-bold mb-1 card-title">{title}</h3>}
          {subtitle && <p className="text-sm muted mb-3">{subtitle}</p>}
          <div className="card-body">{children}</div>
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export default Card;
