// HMACでセッションIDの署名を検証
async function verifySessionToken(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 2) return false;
        const [sessionId, sigHex] = parts;

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const sigBytes = new Uint8Array(sigHex.match(/.{2}/g).map(b => parseInt(b, 16)));
        return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(sessionId));
    } catch {
        return false;
    }
}

export async function onRequest(context) {
    const { request, next, env } = context;
    const url = new URL(request.url);

    // 静的ファイル、ログインページ、APIはスルー
    if (
        url.pathname === '/login' ||
        url.pathname === '/login.html' ||
        url.pathname.startsWith('/api/') ||
        url.pathname.includes('.')
    ) {
        return next();
    }

    // SESSION_SECRET が未設定の場合は全アクセスをブロック
    const sessionSecret = (env.SESSION_SECRET || '').trim();
    if (!sessionSecret) {
        return Response.redirect(new URL('/login', request.url), 302);
    }

    // Cookie からセッショントークンを取得
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = Object.fromEntries(
        cookieHeader.split(';')
            .map(c => c.trim())
            .filter(c => c.includes('='))
            .map(c => {
                const idx = c.indexOf('=');
                return [c.slice(0, idx), c.slice(idx + 1)];
            })
    );

    const sessionToken = cookies['session_token'];

    if (!sessionToken) {
        return Response.redirect(new URL('/login', request.url), 302);
    }

    // HMACで署名を検証
    const isValid = await verifySessionToken(sessionToken, sessionSecret);

    if (isValid) {
        return next();
    }

    // 無効なセッション → Cookieを削除してログインへ
    const redirectResponse = Response.redirect(new URL('/login', request.url), 302);
    redirectResponse.headers.set('Set-Cookie', 'session_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
    return redirectResponse;
}
