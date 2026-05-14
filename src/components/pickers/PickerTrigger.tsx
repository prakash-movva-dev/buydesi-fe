import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PickerTriggerProps {
  /** Displayed when there's a selected value. */
  label: string | null;
  placeholder: string;
  onClick: () => void;
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
  /** Optional secondary text shown beside the main label (e.g. status). */
  detail?: string | null;
}

export const PickerTrigger = ({
  label,
  placeholder,
  onClick,
  onClear,
  disabled,
  className,
  detail,
}: PickerTriggerProps) => (
  <div
    className={cn(
      'flex h-10 w-full items-center rounded-md border border-input bg-background pr-1 text-sm',
      'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
      disabled && 'cursor-not-allowed opacity-50',
      className,
    )}
  >
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left"
    >
      {label ? (
        <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      ) : (
        <span className="flex-1 truncate text-muted-foreground">{placeholder}</span>
      )}
      {detail && <span className="hidden text-xs text-muted-foreground sm:inline">{detail}</span>}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
    {label && onClear && !disabled && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="rounded-md p-1 text-muted-foreground hover:bg-accent"
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);
