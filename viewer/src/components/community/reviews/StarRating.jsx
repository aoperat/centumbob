import { IconStar } from '../../Icons';

export default function StarRating({
  rating = 0,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange = null,
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (index) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }, (_, index) => {
        const filled = index < rating;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(index)}
            disabled={!interactive}
            className={`
              ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
              ${filled ? 'text-yellow-400' : 'text-slate-300'}
            `}
          >
            <IconStar className={sizeClasses[size]} filled={filled} />
          </button>
        );
      })}
    </div>
  );
}

export function StarRatingDisplay({ average, count, size = 'sm' }) {
  const roundedAverage = Math.round(average * 10) / 10;
  const filledStars = Math.round(average);

  return (
    <div className="flex items-center gap-1">
      <StarRating rating={filledStars} size={size} />
      {count > 0 && (
        <span className="text-sm text-slate-500 ml-1">
          {roundedAverage} ({count})
        </span>
      )}
    </div>
  );
}
