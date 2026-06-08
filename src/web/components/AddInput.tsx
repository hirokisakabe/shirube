import { useState } from "react";

type Props = {
  onAdd: (text: string) => void;
  placeholder?: string;
};

export function AddInput({ onAdd, placeholder }: Props) {
  const [val, setVal] = useState('');

  const submit = () => {
    if (val.trim()) { onAdd(val); setVal(''); }
  };

  return (
    <div className="add">
      <span className="add-plus">+</span>
      <input
        className="add-input"
        value={val}
        placeholder={placeholder ?? 'タスクを追加'}
        onChange={(e) => setVal(e.target.value.replace(/\n/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
          if (e.key === 'Escape') setVal('');
        }}
        onBlur={submit}
      />
    </div>
  );
}
