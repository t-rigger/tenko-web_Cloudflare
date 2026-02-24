export async function onRequest(context) {
    const { env } = context;

    // キー名にスペースが含まれていても見つけられるように、全キーをループして正規化して検索
    const findEnv = (keyName) => {
        // 直接一致があればそれを返す
        if (env[keyName]) return env[keyName];

        // 全キーをループして、スペースを除去した名前で一致するものを探す
        const targetKey = keyName.trim();
        for (const [k, v] of Object.entries(env)) {
            if (k.trim() === targetKey) {
                return v;
            }
        }
        return null;
    };

    const gasApiUrl = findEnv('GAS_API_URL');
    const gasApiKey = findEnv('GAS_API_KEY');

    return new Response(JSON.stringify({
        gasApiUrl: (gasApiUrl || '').trim(),
        gasApiKey: (gasApiKey || '').trim(),
        debug: {
            hasUrl: !!gasApiUrl,
            hasKey: !!gasApiKey,
            allKeys: Object.keys(env)
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
