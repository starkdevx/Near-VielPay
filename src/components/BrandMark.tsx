import React from 'react';

export function NearVeilLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <div className="flex items-center gap-3 group">
      <div
        className={`${iconSize} rounded-xl bg-gradient-to-br from-[#e5be70]/30 via-[#d4b06a]/12 to-transparent border border-[#d4b06a]/50 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_16px_-4px_rgba(212,176,106,0.3)] group-hover:border-[#e5be70]/75 transition-all duration-200`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4 h-4 text-[#f5dfa8]"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L3 7v6c0 5.25 3.84 9.74 9 11 5.16-1.26 9-5.75 9-11V7l-9-5z" />
          <path d="M8.5 11.5L12 8l3.5 3.5L12 15l-3.5-3.5z" fill="currentColor" fillOpacity="0.3" />
        </svg>
      </div>
      <div className={`font-serif ${textSize} tracking-tight text-[#f5f2eb] leading-none`}>
        NearPay <span className="italic text-[#e5be70]">Veil</span>
      </div>
    </div>
  );
}

export function ChainDot({ chain }: { chain: string }) {
  const normalized = chain.toLowerCase();
  let colorClass = 'bg-[#77b28c]';
  let ringClass = 'ring-[#77b28c]/25';

  if (normalized.includes('solana')) {
    colorClass = 'bg-violet-400';
    ringClass = 'ring-violet-400/25';
  } else if (normalized.includes('base')) {
    colorClass = 'bg-sky-400';
    ringClass = 'ring-sky-400/25';
  } else if (normalized.includes('arbitrum')) {
    colorClass = 'bg-blue-400';
    ringClass = 'ring-blue-400/25';
  } else if (normalized.includes('ethereum')) {
    colorClass = 'bg-indigo-300';
    ringClass = 'ring-indigo-300/25';
  }

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colorClass} ring-4 ${ringClass} shrink-0`}
    />
  );
}
