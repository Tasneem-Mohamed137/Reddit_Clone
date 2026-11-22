import { AlignJustify, LayoutList } from 'lucide-react';
import Dropdown from '../ui/Dropdown';

const SORTS = [
  { value: 'best', label: 'Best' },
  { value: 'new', label: 'New' },
  { value: 'top', label: 'Top' },
];
const RANGES = [
  { value: 'hour', label: 'Past Hour' },
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];
const VIEWS = [
  { value: 'card', label: 'Card' },
  { value: 'compact', label: 'Compact' },
];

const labelOf = (list, value) => list.find((item) => item.value === value)?.label;

export default function FeedControls({ controls }) {
  const { sort, setSort, range, setRange, view, setView } = controls;
  return (
    <div className="mb-1 flex items-center justify-between">
      <div className="flex items-center">
        <Dropdown label={labelOf(SORTS, sort)} items={SORTS} onSelect={setSort} />
        {sort === 'top' && <Dropdown label={labelOf(RANGES, range)} items={RANGES} onSelect={setRange} />}
      </div>
      <Dropdown
        align="right"
        items={VIEWS}
        onSelect={setView}
        label={
          <>
            {view === 'card' ? <LayoutList size={16} /> : <AlignJustify size={16} />}
            {labelOf(VIEWS, view)}
          </>
        }
      />
    </div>
  );
}