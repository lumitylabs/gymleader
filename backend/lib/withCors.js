// lib/withCors.js
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000', // Adicionei caso use porta 3000 localmente
  'https://chaplin-xlb1.onrender.com',
  'https://chaplin.lumitylabs.com',
  'https://web3museum.lumitylabs.com',
  'https://web3museum.onrender.com'
];

const withCors = (handler) => {
  return async (req, res) => {
    const origin = req.headers.origin;
    
    // Verifica se a origem está na lista branca
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // Opcional: Permitir qualquer origem em desenvolvimento se necessário, 
      // ou manter restrito. Para testes locais as vezes '*' ajuda se a porta mudar.
      // res.setHeader('Access-Control-Allow-Origin', '*'); 
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Trata a requisição preflight (OPTIONS) imediatamente
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    return handler(req, res);
  };
};

module.exports = { withCors };