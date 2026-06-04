import { Link } from 'react-router-dom'

interface AtreyusLogoProps {
  showWordmark?: boolean
  size?: 'sm' | 'md'
}

export default function AtreyusLogo({
  showWordmark = true,
  size = 'md',
}: AtreyusLogoProps) {
  const iconSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const textSize = size === 'sm' ? 'text-base' : 'text-lg'

  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <img
        src="/atreyus-logo.svg"
        alt="Atreyus"
        className={`${iconSize} shrink-0 transition-transform duration-200 group-hover:scale-105`}
      />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={`${textSize} font-semibold tracking-tight text-white`}>
            Atreyus
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-atreyus-muted">
            Bid Analysis
          </span>
        </div>
      )}
    </Link>
  )
}
