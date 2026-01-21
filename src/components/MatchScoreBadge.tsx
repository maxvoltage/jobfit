import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MatchScoreBadgeProps {
  score: number;
  className?: string;
}

export function MatchScoreBadge({ score, className }: MatchScoreBadgeProps) {
  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'destructive';
  };

  const variant = getScoreVariant(score);

  return (
    <Badge
      className={cn(
        'font-medium px-2.5 py-0.5',
        variant === 'success' && 'bg-success/10 text-success hover:bg-success/20 border-success/20',
        variant === 'warning' && 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/20',
        variant === 'destructive' && 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20',
        className
      )}
      variant="outline"
    >
      {score}%
    </Badge>
  );
}
