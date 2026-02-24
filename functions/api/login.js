// セキュアな定数時間比較（タイミング攻撃対策）
async function secureCompare(a, b) {
    if (a.length !== b.length) return false;
    const encoder = new TextEncoder();
    const aBuffer = encoder.encode(a);
    const bBuffer = encoder.encode(b);
    let result = 0;
    for (let i = 0; i < aBuffer.length; i++) {
        result |= aBuffer[i] ^ bBuffer[i];
    }
    return result === 0;
}

// 暗号的にランダムなセッションIDを生成
function generateSessionId() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMACを使ってセッションIDに署名
async function signSessionId(sessionId, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(sessionId));
    const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${sessionId}.${sigHex}`;
}

// レートリミットのためのインメモリカウンター（ワーカーの再起動でリセットされる）
// ※本番では Cloudflare KV や Durable Objects を推奨
const loginAttempts = {};
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15分

function getRateLimit(ip) {
    const now = Date.now();
    if (!loginAttempts[ip] || now - loginAttempts[ip].windowStart > WINDOW_MS) {
        loginAttempts[ip] = { count: 0, windowStart: now };
    }
    return loginAttempts[ip];
}

function jsonError(message, status) {
    return new Response(JSON.stringify({ message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function onRequestPost(context) {
    const { request, env } = context;

    // ──────────────────────────────────────────
    // 1. 環境変数の存在チェック（デフォルト値を廃止）
    // ──────────────────────────────────────────
    const adminEmail = (env.ADMIN_EMAIL || '').trim();
    const adminPassword = (env.ADMIN_PASSWORD || '').trim();
    const sessionSecret = (env.SESSION_SECRET || '').trim();

    if (!adminEmail || !adminPassword || !sessionSecret) {
        console.error('SECURITY: Required env vars not set (ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET)');
        return jsonError('サーバー設定エラーです。', 500);
    }

    // ──────────────────────────────────────────
    // 2. レートリミット
    // ──────────────────────────────────────────
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateInfo = getRateLimit(ip);
    rateInfo.count++;

    if (rateInfo.count > MAX_ATTEMPTS) {
        return jsonError('ログイン試行回数が多すぎます。しばらく待ってから再試行してください。', 429);
    }

    // ──────────────────────────────────────────
    // 3. リクエストのパース
    // ──────────────────────────────────────────
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return jsonError('リクエストの形式が正しくありません。', 400);
    }

    const inputEmail = (body.email || '').trim();
    const inputPassword = (body.password || '').trim();

    if (!inputEmail || !inputPassword) {
        return jsonError('メールアドレスとパスワードを入力してください。', 400);
    }

    // ──────────────────────────────────────────
    // 4. 定数時間比較（タイミング攻撃対策）
    //    エラーメッセージは「どこが違うか」を明かさない
    // ──────────────────────────────────────────
    const emailMatch = await secureCompare(inputEmail, adminEmail);
    const passwordMatch = await secureCompare(inputPassword, adminPassword);

    if (!emailMatch || !passwordMatch) {
        // 成功時と同じ程度の遅延を加えることで、タイミングで情報を漏らさない
        await new Promise(r => setTimeout(r, 200));
        return jsonError('メールアドレスまたはパスワードが正しくありません。', 401);
    }

    // ──────────────────────────────────────────
    // 5. 認証成功 → セキュアなセッショントークン発行
    // ──────────────────────────────────────────
    rateInfo.count = 0; // ログイン成功でカウンターリセット

    const sessionId = generateSessionId();
    const signedToken = await signSessionId(sessionId, sessionSecret);

    const response = new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

    // Secure, HttpOnly, SameSite=Strict で Cookie を設定
    response.headers.set(
        'Set-Cookie',
        `session_token=${signedToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
    );

    return response;
}
