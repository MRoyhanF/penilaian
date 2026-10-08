'use client';

import React from 'react';

/**
 * BrandLogo - Official YCWC Regional Jambi & Timedoor Academy Co-branded Component
 * Supports multiple responsive variants: 'small' (navbar), 'medium' (sidebar/header), 'large' (login page)
 */
export default function BrandLogo({ 
  size = 'medium', 
  showSubtitle = true, 
  showTimedoor = true,
  onClick 
}) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  return (
    <div 
      className={`ycwc-brand-container ${size} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title="YCWC Regional Jambi - Timedoor Academy"
    >
      {/* High-Fidelity SVG Brand Emblem */}
      <div className="ycwc-logo-mark">
        <div className="logo-badge-layer">
          <svg 
            className="ycwc-vector-svg" 
            viewBox="0 0 48 48" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            width={isLarge ? 48 : (isSmall ? 22 : 30)}
            height={isLarge ? 48 : (isSmall ? 22 : 30)}
          >
            <defs>
              <linearGradient id="tdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00c0f3" />
                <stop offset="50%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#ff5722" />
              </linearGradient>
              <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <filter id="glowDrop" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#4f46e5" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Timedoor Academy Portal Shape (Isometric Hexagon Door) */}
            <path 
              d="M24 4L42 14V34L24 44L6 34V14L24 4Z" 
              fill="url(#tdGradient)" 
              opacity="0.95"
            />
            
            {/* Inner Portal Frame */}
            <path 
              d="M24 10L36 17V31L24 38L12 31V17L24 10Z" 
              fill="#0f172a" 
              opacity="0.3"
            />

            {/* Code Brackets < / > and Trophy Silhouette */}
            <path 
              d="M16 20L11 24L16 28" 
              stroke="#ffffff" 
              strokeWidth="2.7" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M32 20L37 24L32 28" 
              stroke="#ffffff" 
              strokeWidth="2.7" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Center Trophy / Star Emblem */}
            <path 
              d="M20 17H28V22C28 24.2 26.2 26 24 26C21.8 26 20 24.2 20 22V17Z" 
              fill="url(#trophyGold)" 
            />
            <path 
              d="M24 26V30M21 30H27" 
              stroke="url(#trophyGold)" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
            />
            
            {/* Star Sparkle */}
            <circle cx="37" cy="11" r="2.5" fill="#fbbf24" filter="url(#glowDrop)" />
          </svg>
        </div>
      </div>

      {/* Brand Typography & Badges */}
      <div className="ycwc-brand-text">
        <div className="ycwc-title-row">
          <span className="ycwc-acronym">YCWC</span>
          <span className="ycwc-region-pill">REGIONAL JAMBI</span>
        </div>
        
        {showSubtitle && (
          <div className="ycwc-subtitle-row">
            <span className="ycwc-subtext">Young Creators Web Competition</span>
            {showTimedoor && (
              <span className="ycwc-timedoor-badge">
                <span className="td-dot" />
                Timedoor Academy
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
