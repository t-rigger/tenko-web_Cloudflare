export async function onRequest(context) {
    const response = new Response(null, {
        status: 302,
        headers: { 'Location': '/login' }
    });

    // Cookie を削除 (過去の有効期限を設定して上書き)
    response.headers.set('Set-Cookie', 'session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

    return response;
}
