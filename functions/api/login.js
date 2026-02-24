export async function onRequestPost(context) {
    const { request, env } = context;
    const body = await request.json();

    const { email, password } = body;

    const adminEmail = env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = env.ADMIN_PASSWORD || 'password123';

    if (email === adminEmail && password === adminPassword) {
        // 認証成功
        const sessionToken = btoa(`${adminEmail}:${adminPassword}`);

        // Cookie の設定 (HttpOnly, Secure, SameSite=Lax)
        // Cloudflare Pages では response.headers.set('Set-Cookie', ...) を使う
        const response = new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

        response.headers.set('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);

        return response;
    }

    return new Response(JSON.stringify({ message: 'メールアドレスまたはパスワードが正しくありません。' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
    });
}
