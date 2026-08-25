import { useMemo, useRef, useEffect, useCallback } from 'react';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220px
const PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2; // 88px

const PAST_DAYS = 90;
const FUTURE_DAYS = 30;

interface WheelColumnProps<T> {
  items: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatItem?: (item: T) => string;
  widthClass?: string;
  alignClass?: string;
}

function WheelColumn<T>({
  items,
  selectedIndex,
  onSelect,
  formatItem = (item) => String(item),
  widthClass = 'flex-1',
  alignClass = 'justify-center text-center',
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const timeoutRef = useRef<any>(null);

  // Scroll to selectedIndex on initial render or when selectedIndex changes externally
  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const targetScroll = selectedIndex * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetScroll) > 2) {
        containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    isScrollingRef.current = true;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

      // Snap exactly
      containerRef.current.scrollTo({ top: clampedIndex * ITEM_HEIGHT, behavior: 'smooth' });
      onSelect(clampedIndex);
      isScrollingRef.current = false;
    }, 70);
  }, [items.length, onSelect]);

  return (
    <div className={`relative h-[${WHEEL_HEIGHT}px] ${widthClass} select-none overflow-hidden`}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          paddingTop: `${PADDING}px`,
          paddingBottom: `${PADDING}px`,
          height: `${WHEEL_HEIGHT}px`,
          scrollSnapType: 'y mandatory',
        }}
        className="overflow-y-auto overscroll-contain no-scrollbar"
      >
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const distance = Math.abs(idx - selectedIndex);

          return (
            <div
              key={idx}
              onClick={() => {
                onSelect(idx);
                if (containerRef.current) {
                  containerRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
                }
              }}
              style={{
                height: `${ITEM_HEIGHT}px`,
                scrollSnapAlign: 'center',
              }}
              className={`flex items-center ${alignClass} cursor-pointer transition-all duration-150 px-2 ${
                isSelected
                  ? 'text-zinc-950 font-black text-lg tracking-tight scale-102'
                  : distance === 1
                    ? 'text-zinc-500 font-semibold text-base'
                    : 'text-zinc-300 font-normal text-sm opacity-50'
              }`}
            >
              {formatItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface IOSDateTimePickerProps {
  value: Date;
  onChange: (newDate: Date) => void;
  onConfirm: () => void;
}

export function IOSDateTimePicker({
  value,
  onChange,
  onConfirm,
}: IOSDateTimePickerProps) {
  // Generate list of rolling days (from -PAST_DAYS to +FUTURE_DAYS)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const datesList = useMemo(() => {
    const list: Date[] = [];
    for (let i = -PAST_DAYS; i <= FUTURE_DAYS; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }, [today]);

  const hoursList = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutesList = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  // Find index corresponding to current selected value
  const selectedDateIndex = useMemo(() => {
    const target = new Date(value);
    target.setHours(0, 0, 0, 0);
    const idx = datesList.findIndex(d => d.getTime() === target.getTime());
    return idx !== -1 ? idx : PAST_DAYS; // default to today
  }, [value, datesList]);

  const selectedHourIndex = value.getHours();
  const selectedMinuteIndex = value.getMinutes();

  const handleDateSelect = (idx: number) => {
    const targetDay = datesList[idx];
    const newDate = new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      value.getHours(),
      value.getMinutes(),
      0
    );
    onChange(newDate);
  };

  const handleHourSelect = (idx: number) => {
    const newDate = new Date(value);
    newDate.setHours(hoursList[idx]);
    onChange(newDate);
  };

  const handleMinuteSelect = (idx: number) => {
    const newDate = new Date(value);
    newDate.setMinutes(minutesList[idx]);
    onChange(newDate);
  };

  const formatRelativeDate = (d: Date) => {
    if (d.getTime() === today.getTime()) {
      return "Aujourd'hui";
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.getTime() === yesterday.getTime()) {
      return "Hier";
    }
    const weekday = d.toLocaleDateString('fr-FR', { weekday: 'short' });
    const day = d.getDate();
    const month = d.toLocaleDateString('fr-FR', { month: 'short' });
    const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');
    return `${capWeekday} ${day} ${month}`;
  };

  return (
    <div className="space-y-4 select-none">
      {/* Minimalist Native iOS 3-Column Wheel (Date | Hour | Minute) */}
      <div className="relative py-1 overflow-hidden">
        {/* Subtle Highlight selection bar behind text */}
        <div
          style={{
            top: `${PADDING + 4}px`,
            height: `${ITEM_HEIGHT}px`,
          }}
          className="absolute inset-x-0 bg-zinc-100/70 border-y border-zinc-200/80 rounded-2xl pointer-events-none z-0"
        />

        {/* Top Fade Gradient */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10" />

        {/* Bottom Fade Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />

        {/* 3 Wheel Columns */}
        <div className="relative z-0 flex items-center">
          {/* 1. Date Column (Day + Month) */}
          <WheelColumn
            items={datesList}
            selectedIndex={selectedDateIndex}
            onSelect={handleDateSelect}
            formatItem={formatRelativeDate}
            widthClass="w-[56%]"
            alignClass="justify-start pl-4"
          />

          {/* 2. Hour Column (Clean 2 digits) */}
          <WheelColumn
            items={hoursList}
            selectedIndex={selectedHourIndex}
            onSelect={handleHourSelect}
            formatItem={(h) => String(h).padStart(2, '0')}
            widthClass="w-[22%]"
            alignClass="justify-center text-center"
          />

          {/* 3. Minute Column (Clean 2 digits) */}
          <WheelColumn
            items={minutesList}
            selectedIndex={selectedMinuteIndex}
            onSelect={handleMinuteSelect}
            formatItem={(m) => String(m).padStart(2, '0')}
            widthClass="w-[22%]"
            alignClass="justify-center text-center"
          />
        </div>
      </div>

      {/* Confirm CTA Button at Bottom */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Confirmer</span>
        </button>
      </div>
    </div>
  );
}
