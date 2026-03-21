import { useState } from 'react';
import { Search } from 'lucide-react';

interface Props {
  placeholder?: string;
  onSearch: (q: string) => void;
  'data-testid'?: string;
}

export function SearchBar({ placeholder = 'Hledat...', onSearch, 'data-testid': testId }: Props) {
  const [value, setValue] = useState('');

  return (
    <div className="search-bar">
      <Search size={15} color="var(--text-muted)" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        data-testid={testId}
        onChange={(e) => {
          setValue(e.target.value);
          onSearch(e.target.value);
        }}
      />
    </div>
  );
}
