export async function onRequest(context) {
    const { request, next, env } = context;
    const url = new URL(request.url);

    // /login と /api/* はスルーする
    if (url.pathname === '/login' || url.pathname.startsWith('/api/') || url.pathname.includes('.')) {
        return next();
    }

    // Cookie を取得
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => c.trim().split('=')));

    // セッショントークンの検証 (簡易的に環境変数の値と一致するかチェック)
    // 実際にはランダムな文字列を生成して保存するのが理想だが、Railsの構成に寄せてパスワード自体をキーに代用
    const sessionToken = cookies['session_token'];
    const expectedToken = btoa(`${env.ADMIN_EMAIL}:${env.ADMIN_PASSWORD}`);

    if (sessionToken === expectedToken) {
        return next();
    }

    // 認証に失敗した場合はログイン画面へリダイレクト
    return Response.redirect(new URL('/login', request.url), 302);
}
