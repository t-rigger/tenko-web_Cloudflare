export async function onRequest(context) {
    const { env } = context;

    // 認証済みユーザーにのみ設定値を返す (middlewareでガードされている前提)
    return new Response(JSON.stringify({
        gasApiUrl: env.GAS_API_URL,
        gasApiKey: env.GAS_API_KEY
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
