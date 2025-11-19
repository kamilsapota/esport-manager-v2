import React from 'react';

interface CountryFlagProps {
  countryCode: string;
  className?: string;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({ countryCode, className = "h-3 w-auto" }) => {
  const [error, setError] = React.useState(false);

  // Map common non-standard codes to ISO 3166-1 alpha-2 for FlagCDN
  const map: Record<string, string> = {
    'UK': 'gb',
    'EN': 'gb',
    'EU': 'eu',
    'XK': 'xk', // Kosovo
    'KS': 'xk',
    'USA': 'us',
    'CAN': 'ca',
    'GER': 'de',
    'FRA': 'fr',
    'SWE': 'se',
    'NOR': 'no',
    'DEN': 'dk',
    'FIN': 'fi',
    'POL': 'pl',
    'UKR': 'ua',
    'RUS': 'ru',
    'BRA': 'br',
    'ARG': 'ar',
    'AUS': 'au',
    'CHN': 'cn',
    'KAZ': 'kz',
  };

  const code = map[countryCode.toUpperCase()] || countryCode.toLowerCase();

  if (error) {
      return <span className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">{countryCode}</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/h20/${code}.png`}
      srcSet={`https://flagcdn.com/h40/${code}.png 2x`}
      height="20"
      alt={countryCode}
      title={countryCode}
      className={`inline-block shadow-sm rounded-[1px] object-contain ${className}`}
      onError={() => setError(true)}
    />
  );
};