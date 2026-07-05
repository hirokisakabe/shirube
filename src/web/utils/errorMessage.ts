export function getUserFacingErrorMessage(error: string) {
  if (
    /^(TypeError|Error):\s*Failed to fetch$|^Failed to fetch$|^NetworkError\b|^Load failed$/i.test(
      error,
    )
  ) {
    return "通信に失敗しました。サーバーに接続できないか、ネットワークが不安定です。";
  }

  if (/Failed to (fetch|create|update|delete|save) .+/i.test(error)) {
    return "データの読み込みまたは保存に失敗しました。通信状態を確認してください。";
  }

  return "データを読み込めませんでした。しばらくしてからもう一度お試しください。";
}
