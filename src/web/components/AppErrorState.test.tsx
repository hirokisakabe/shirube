import { describe, expect, it } from "vitest";
import { getUserFacingErrorMessage } from "./AppErrorState";

describe("getUserFacingErrorMessage", () => {
  it("fetch 自体の失敗を通信失敗として表示する", () => {
    expect(getUserFacingErrorMessage("TypeError: Failed to fetch")).toBe(
      "通信に失敗しました。サーバーに接続できないか、ネットワークが不安定です。",
    );
  });

  it("API エラーをデータ取得失敗として表示する", () => {
    expect(getUserFacingErrorMessage("Error: Failed to fetch tasks: 500")).toBe(
      "データの読み込みまたは保存に失敗しました。通信状態を確認してください。",
    );
  });
});
