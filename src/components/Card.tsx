import React from 'react';

type CardProps = {
  title?: string;
  subtitle?: string;
  image?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  variant?: 'default' | 'cut';
};

const Card: React.FC<CardProps> = ({ title, subtitle, image, children, footer, className = '', onClick, style, variant = 'default' }) => {
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
    <div style={style} className={`card-3d h-full ${variant === 'cut' ? 'cut-card' : ''} ${className}`}>
      <div
        className={`card-inner glass-card h-full flex flex-col overflow-hidden ${clickableClass}`}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {image && variant === 'cut' ? (
          <div className="cut-avatar-wrap w-full flex items-center justify-center py-6">
            <div className="cut-avatar">
              <a href={image} target="_blank" rel="noreferrer" className="block w-full h-full">
                <img src={image} alt={title || 'card-image'} className="w-full h-full object-cover rounded-full" />
              </a>
            </div>
          </div>
        ) : image ? (
          <div className="aspect-4/3 w-full bg-white/70 dark:bg-black/20 overflow-hidden border-b border-white/10">
            <a href={image} target="_blank" rel="noreferrer" className="block h-full w-full">
              <img src={image} alt={title || 'card-image'} className="h-full w-full object-contain p-2 sm:p-3" />
            </a>
          </div>
        ) : null}
        <div className="p-4 flex-1 flex flex-col">
          {title && <h3 className="text-lg font-bold mb-1 card-title">{title}</h3>}
          {subtitle && <p className="text-sm muted mb-3">{subtitle}</p>}
          <div className="card-body flex-1">{children}</div>
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export default Card;
