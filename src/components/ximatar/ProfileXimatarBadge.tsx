import { getXimatarImageUrl } from '@/lib/ximatar/image';

type Props = {
  name: string;
  avatar_path?: string | null;
  updated_at?: string | null;
  subtitle?: string;
  traits?: string[];
  roles?: string[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export default function ProfileXimatarBadge({ 
  name, 
  avatar_path, 
  updated_at, 
  subtitle, 
  traits,
  roles,
  className = '',
  size = 'md'
}: Props) {
  const src = getXimatarImageUrl(avatar_path, updated_at || '');
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };
  
  const containerClasses = {
    sm: 'gap-2 px-2 py-1.5',
    md: 'gap-3 px-3 py-2',
    lg: 'gap-4 px-4 py-3'
  };

  return (
    <div className={`flex items-start rounded-xl border bg-card/60 ${containerClasses[size]} ${className}`}>
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-muted flex-shrink-0`}>
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">?</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {subtitle && (
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
            {subtitle}
          </div>
        )}
        <div className={`font-semibold truncate ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'}`}>
          {name}
        </div>
        {traits && traits.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {traits.slice(0, 3).join(' • ')}
          </div>
        )}
        {roles && roles.length > 0 && size === 'lg' && (
          <div className="text-xs text-muted-foreground mt-1 opacity-70">
            {roles.slice(0, 2).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
