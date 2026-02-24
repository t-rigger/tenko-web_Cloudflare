export async function onRequest(context) {
    const { env } = context;
    // /api/config はミドルウェアのガード対象なので、認証済みユーザーのみ到達可能

    const findEnv = (keyName) => {
        if (env[keyName]) return env[keyName];
        const targetKey = keyName.trim();
        for (const [k, v] of Object.entries(env)) {
            if (k.trim() === targetKey) return v;
        }
        return null;
    };

    const gasApiUrl = findEnv('GAS_API_URL');
    const gasApiKey = findEnv('GAS_API_KEY');

    if (!gasApiUrl) {
        // デバッグ情報は一切返さない（キー一覧の漏洩を防ぐ）
        return new Response(JSON.stringify({ error: 'config_missing' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
        gasApiUrl: gasApiUrl.trim(),
        gasApiKey: (gasApiKey || '').trim()
        // debug フィールドは本番では削除
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
