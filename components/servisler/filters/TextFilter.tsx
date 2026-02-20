'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

type TextFilterProps = {
  deger: string;
  placeholder: string;
  dataTestId: string;
  onDegerDegisti: (deger: string) => void;
};

export function TextFilter({
  deger,
  placeholder,
  dataTestId,
  onDegerDegisti,
}: TextFilterProps) {
  const [yerelDeger, setYerelDeger] = useState(deger);

  useEffect(() => {
    setYerelDeger(deger);
  }, [deger]);

  useEffect(() => {
    const zamanlayici = window.setTimeout(() => {
      if (yerelDeger !== deger) {
        onDegerDegisti(yerelDeger.trim());
      }
    }, 300);

    return () => window.clearTimeout(zamanlayici);
  }, [deger, onDegerDegisti, yerelDeger]);

  return (
    <div className="space-y-2 p-2">
      <Input
        value={yerelDeger}
        onChange={(event) => setYerelDeger(event.target.value)}
        placeholder={placeholder}
        className="h-8"
        data-testid={`${dataTestId}-input`}
      />
    </div>
  );
}
