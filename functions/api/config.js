export async function onRequest(context) {
    const { env } = context;

    // デバッグ用に環境変数のキーが存在するかチェック
    const hasUrl = !!env.GAS_API_URL;
    const hasKey = !!env.GAS_API_KEY;

    // 値を返す（見つからない場合は明示的に文字列を返す）
    return new Response(JSON.stringify({
        gasApiUrl: env.GAS_API_URL || null,
        gasApiKey: env.GAS_API_KEY || null,
        debug: {
            hasUrl: hasUrl,
            hasKey: hasKey,
            allKeys: Object.keys(env) // セキュリティ上、キー名だけを返す
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
