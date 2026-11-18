import React from 'react';

interface CountryFlagProps {
  code: string;
  className?: string;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({ code, className = 'w-6 h-4' }) => {
  const renderFlag = () => {
    switch (code) {
      case 'CH':
        return (
          <>
            <rect width="24" height="16" fill="#D52B1E" />
            <rect x="10.5" y="3.5" width="3" height="9" fill="#FFFFFF" />
            <rect x="7.5" y="6.5" width="9" height="3" fill="#FFFFFF" />
          </>
        );
      case 'DE':
        return (
          <>
            <rect width="24" height="5.33" y="0" fill="#111827" />
            <rect width="24" height="5.33" y="5.33" fill="#DC2626" />
            <rect width="24" height="5.34" y="10.66" fill="#FACC15" />
          </>
        );
      case 'NL':
        return (
          <>
            <rect width="24" height="5.33" y="0" fill="#AE1C28" />
            <rect width="24" height="5.33" y="5.33" fill="#FFFFFF" />
            <rect width="24" height="5.34" y="10.66" fill="#21468B" />
          </>
        );
      case 'GB':
        return (
          <>
            <rect width="24" height="16" fill="#012169" />
            <path d="M0,0 L24,16 M24,0 L0,16" stroke="#FFFFFF" strokeWidth="2.8" />
            <path d="M0,0 L24,16 M24,0 L0,16" stroke="#C8102E" strokeWidth="1.4" />
            <path d="M12,0 V16 M0,8 H24" stroke="#FFFFFF" strokeWidth="4.4" />
            <path d="M12,0 V16 M0,8 H24" stroke="#C8102E" strokeWidth="2.6" />
          </>
        );
      case 'SE':
        return (
          <>
            <rect width="24" height="16" fill="#006AA7" />
            <rect x="7" y="0" width="3" height="16" fill="#FECC00" />
            <rect x="0" y="6.5" width="24" height="3" fill="#FECC00" />
          </>
        );
      case 'IS':
        return (
          <>
            <rect width="24" height="16" fill="#02529C" />
            <rect x="6.5" y="0" width="4" height="16" fill="#FFFFFF" />
            <rect x="0" y="6" width="24" height="4" fill="#FFFFFF" />
            <rect x="7.5" y="0" width="2" height="16" fill="#DC1E35" />
            <rect x="0" y="7" width="24" height="2" fill="#DC1E35" />
          </>
        );
      case 'AE':
        return (
          <>
            <rect width="24" height="5.33" y="0" fill="#00732F" />
            <rect width="24" height="5.33" y="5.33" fill="#FFFFFF" />
            <rect width="24" height="5.34" y="10.66" fill="#111827" />
            <rect width="6.5" height="16" x="0" fill="#FF0000" />
          </>
        );
      case 'QA':
        return (
          <>
            <rect width="24" height="16" fill="#8D1B3D" />
            <polygon points="0,0 7.5,0 9.5,2 7.5,4 9.5,6 7.5,8 9.5,10 7.5,12 9.5,14 7.5,16 0,16" fill="#FFFFFF" />
          </>
        );
      case 'SG':
        return (
          <>
            <rect width="24" height="8" y="0" fill="#EF3340" />
            <rect width="24" height="8" y="8" fill="#FFFFFF" />
            <circle cx="5.5" cy="4" r="2.3" fill="#FFFFFF" />
            <circle cx="6.4" cy="4" r="2.1" fill="#EF3340" />
          </>
        );
      case 'JP':
        return (
          <>
            <rect width="24" height="16" fill="#FFFFFF" />
            <circle cx="12" cy="8" r="4.2" fill="#BC002D" />
          </>
        );
      case 'AU':
        return (
          <>
            <rect width="24" height="16" fill="#012169" />
            <rect width="10" height="7" fill="#012169" />
            <path d="M5,0 V7 M0,3.5 H10" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M5,0 V7 M0,3.5 H10" stroke="#C8102E" strokeWidth="1" />
            <circle cx="18" cy="4.5" r="1" fill="#FFFFFF" />
            <circle cx="20" cy="8" r="0.9" fill="#FFFFFF" />
            <circle cx="16.5" cy="9.5" r="0.9" fill="#FFFFFF" />
            <circle cx="18" cy="12.5" r="1.1" fill="#FFFFFF" />
          </>
        );
      case 'KR':
        return (
          <>
            <rect width="24" height="16" fill="#FFFFFF" />
            <circle cx="12" cy="8" r="3.8" fill="#CD2E3A" />
            <path d="M8.2,8 A3.8,3.8 0 0,0 15.8,8 A1.9,1.9 0 0,1 12,8 A1.9,1.9 0 0,0 8.2,8 Z" fill="#0047A0" />
          </>
        );
      case 'US':
        return (
          <>
            <rect width="24" height="16" fill="#FFFFFF" />
            {[0, 2.3, 4.6, 6.9, 9.2, 11.5, 13.8].map((y, i) => (
              <rect key={i} width="24" height="1.2" y={y} fill="#B22234" />
            ))}
            <rect width="11" height="8.5" fill="#3C3B6E" />
          </>
        );
      case 'CA':
        return (
          <>
            <rect width="24" height="16" fill="#FF0000" />
            <rect x="6" width="12" height="16" fill="#FFFFFF" />
            <polygon points="12,3.5 13,6.5 15.5,6 14,8.5 15.5,10 12.8,10 12.5,12.5 11.5,12.5 11.2,10 8.5,10 10,8.5 8.5,6 11,6.5" fill="#FF0000" />
          </>
        );
      case 'BR':
        return (
          <>
            <rect width="24" height="16" fill="#009739" />
            <polygon points="12,2 21,8 12,14 3,8" fill="#FEDD00" />
            <circle cx="12" cy="8" r="3.1" fill="#012169" />
          </>
        );
      case 'PK':
        return (
          <>
            <rect width="24" height="16" fill="#01411C" />
            <rect width="6" height="16" fill="#FFFFFF" />
            <circle cx="15" cy="8" r="4" fill="#FFFFFF" />
            <circle cx="16.2" cy="7.2" r="3.4" fill="#01411C" />
          </>
        );
      case 'IN':
        return (
          <>
            <rect width="24" height="5.33" y="0" fill="#FF9933" />
            <rect width="24" height="5.33" y="5.33" fill="#FFFFFF" />
            <rect width="24" height="5.34" y="10.66" fill="#138808" />
            <circle cx="12" cy="8" r="1.8" fill="none" stroke="#000080" strokeWidth="0.9" />
          </>
        );
      case 'FR':
        return (
          <>
            <rect width="8" height="16" x="0" fill="#002395" />
            <rect width="8" height="16" x="8" fill="#FFFFFF" />
            <rect width="8" height="16" x="16" fill="#ED2939" />
          </>
        );
      case 'IT':
        return (
          <>
            <rect width="8" height="16" x="0" fill="#009246" />
            <rect width="8" height="16" x="8" fill="#FFFFFF" />
            <rect width="8" height="16" x="16" fill="#CE2B37" />
          </>
        );
      case 'ES':
        return (
          <>
            <rect width="24" height="4" y="0" fill="#AA151B" />
            <rect width="24" height="8" y="4" fill="#F1BF00" />
            <rect width="24" height="4" y="12" fill="#AA151B" />
          </>
        );
      case 'TR':
        return (
          <>
            <rect width="24" height="16" fill="#E30A17" />
            <circle cx="10.5" cy="8" r="3.6" fill="#FFFFFF" />
            <circle cx="11.6" cy="8" r="2.9" fill="#E30A17" />
          </>
        );
      case 'SA':
        return (
          <>
            <rect width="24" height="16" fill="#006C35" />
            <rect x="6" y="7" width="12" height="1.5" rx="0.7" fill="#FFFFFF" />
          </>
        );
      case 'EG':
        return (
          <>
            <rect width="24" height="5.33" y="0" fill="#CE1126" />
            <rect width="24" height="5.33" y="5.33" fill="#FFFFFF" />
            <rect width="24" height="5.34" y="10.66" fill="#111827" />
            <circle cx="12" cy="8" r="1.4" fill="#C09300" />
          </>
        );
      case 'ZA':
        return (
          <>
            <rect width="24" height="8" y="0" fill="#E03C31" />
            <rect width="24" height="8" y="8" fill="#001489" />
            <polygon points="0,0 10,8 0,16" fill="#007749" />
          </>
        );
      case 'MX':
        return (
          <>
            <rect width="8" height="16" x="0" fill="#006847" />
            <rect width="8" height="16" x="8" fill="#FFFFFF" />
            <rect width="8" height="16" x="16" fill="#CE1126" />
            <circle cx="12" cy="8" r="1.7" fill="#8B5A2B" />
          </>
        );
      default:
        return (
          <>
            <rect width="24" height="16" fill="#0F172A" />
            <circle cx="12" cy="8" r="5" fill="none" stroke="#38BDF8" strokeWidth="1.2" />
            <ellipse cx="12" cy="8" rx="2.4" ry="5" fill="none" stroke="#38BDF8" strokeWidth="1" />
            <line x1="7" y1="8" x2="17" y2="8" stroke="#38BDF8" strokeWidth="1" />
          </>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 24 16"
      className={`${className} rounded-[3px] border border-slate-300/60 dark:border-slate-700/80 shrink-0 overflow-hidden`}
      aria-hidden="true"
    >
      {renderFlag()}
    </svg>
  );
};
