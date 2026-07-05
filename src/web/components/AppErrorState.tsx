import { cn, ui } from "../styles";

type Props = {
  error: string;
  className?: string;
};

export function getUserFacingErrorMessage(error: string) {
  if (/Failed to fetch|NetworkError|Load failed/i.test(error)) {
    return "通信に失敗しました。サーバーに接続できないか、ネットワークが不安定です。";
  }

  if (/Failed to (fetch|create|update|delete|save)/i.test(error)) {
    return "データの読み込みまたは保存に失敗しました。通信状態を確認してください。";
  }

  return "データを読み込めませんでした。しばらくしてからもう一度お試しください。";
}

export function AppErrorState({ error, className }: Props) {
  const message = getUserFacingErrorMessage(error);

  return (
    <div
      className={cn(
        "flex min-h-full items-center justify-center px-[26px] py-8 max-[760px]:px-[18px]",
        className,
      )}
    >
      <div
        className="w-full max-w-[520px] rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--accent)_28%,var(--hair))] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow)]"
        role="alert"
      >
        <div className="flex gap-3">
          <span
            className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-sm font-semibold text-[var(--accent)]"
            aria-hidden="true"
          >
            !
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-[15px] font-medium text-[var(--ink)]">
              通信エラー
            </h2>
            <p className="mt-1.5 text-[13px] leading-6 text-[var(--ink-soft)]">
              {message}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={cn(ui.button, "min-h-[29px] px-4")}
                onClick={() => window.location.reload()}
              >
                再読み込み
              </button>
              <span className="text-xs text-[var(--ink-faint)]">
                解消しない場合は API サーバーの起動状態を確認してください。
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
