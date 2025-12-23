/**
 * Angular dev-server proxy with:
 * - /auth → https://api-pruebas.luseoeng.com (preserva cookies/credenciales)
 * - /cdn-cgi/rum → responde 204 para silenciar 404s de RUM en local
 */
module.exports = [
  // Force SPA fallback for deep-links under /auth-demo — must come before /auth rule
  {
    context: function (pathname, req) {
      return pathname === '/auth-demo' || pathname.startsWith('/auth-demo/');
    },
    target: 'http://localhost:0',
    bypass: function () {
      return '/';
    }
  },
  // Proxy /auth but avoid matching /auth-demo (match /auth or /auth/... only)
  {
    context: function (pathname, req) {
      return pathname === '/auth' || pathname.startsWith('/auth/');
    },
    target: 'https://api-pruebas.luseoeng.com',
    secure: true,
    changeOrigin: true,
    logLevel: 'debug',
    cookieDomainRewrite: 'localhost',
    cookiePathRewrite: '/'
  },
  {
    context: ['/cdn-cgi/rum'],
    target: 'http://localhost:0',
    bypass: function (req, res) {
      res.statusCode = 204;
      res.end();
      return true; // corta el proxy y finaliza la respuesta
    }
  }
];
