import { useState } from "react";
import { cn } from "../styles";

type Props = {
  onAdd: (text: string) => void;
  placeholder?: string;
  variant?: "default" | "compact";
};

export function AddInput({ onAdd, placeholder, variant = "default" }: Props) {
  const [val, setVal] = useState("");

  const submit = () => {
    if (val.trim()) {
      onAdd(val);
      setVal("");
    }
  };

  return (
    <div
      className={cn(
        "group mt-0.5 flex items-center gap-2 px-1.5 py-1",
        variant === "compact" && "mt-px min-h-4 gap-1 px-0 py-px",
      )}
    >
      <span
        className={cn(
          "w-[17px] flex-none text-center text-[15px] text-[var(--ink-faint)] group-focus-within:text-[var(--accent)]",
          variant === "compact" && "w-2.5 text-[10.5px] leading-none",
        )}
      >
        +
      </span>
      <input
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]",
          variant === "compact" && "text-[11px] leading-[1.2]",
        )}
        value={val}
        placeholder={placeholder ?? "タスクを追加"}
        onChange={(e) => setVal(e.target.value.replace(/\n/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
          if (e.key === "Escape") setVal("");
        }}
        onBlur={submit}
      />
    </div>
  );
}
