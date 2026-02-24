export async function onRequestPost(context) {
    const { request, env } = context;
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ message: 'リクエストの解析に失敗しました。' }), { status: 400 });
    }

    const { email, password } = body;

    // 環境変数から取得（なければデフォルトを使用）
    const adminEmail = (env.ADMIN_EMAIL || 'admin@example.com').trim();
    const adminPassword = (env.ADMIN_PASSWORD || 'password123').trim();
    const inputEmail = (email || '').trim();
    const inputPassword = (password || '').trim();

    // デバッグログ代わりの詳細エラーメッセージ (踏み台にされないよう運用開始後は隠すべきですが、今は原因特定を優先)
    let debugInfo = "";
    if (inputEmail !== adminEmail) debugInfo += "メール不一致 ";
    if (inputPassword !== adminPassword) debugInfo += "パス不一致 ";

    if (inputEmail === adminEmail && inputPassword === adminPassword) {
        // 認証成功
        const sessionToken = btoa(`${adminEmail}:${adminPassword}`);

        const response = new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

        // ログイン状態を維持するための Cookie
        response.headers.set('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);

        return response;
    }

    return new Response(JSON.stringify({
        message: 'メールアドレスまたはパスワードが正しくありません。',
        debug: debugInfo.trim() // <-- どこが間違っているか表示するようにした
    }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
    });
}
