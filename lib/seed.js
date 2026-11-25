// Dados de DEMONSTRAÇÃO do Meu Capítulo para PostgreSQL.
//   node lib/seed.js            -> injeta autores, livros, capítulos, comentários e uma compra
//   node lib/seed.js --limpar   -> remove a demo (usuários @demo.com; livros, capítulos, compras e comentários saem por CASCADE)
// Logins de teste (senha demo123): helena@demo.com, rafael@demo.com, isadora@demo.com, tiago@demo.com, leitor@demo.com
try { require('dotenv').config(); } catch (e) {}
const fs = require('fs'), path = require('path');
let bcrypt; try { bcrypt = require('bcryptjs'); } catch (e) { bcrypt = require('bcrypt'); }
const { pool } = require('../db');

const TXT = {
  'Fantasia': ['A névoa descia da montanha como um animal cansado, trazendo cheiro de ferro e de pinheiro molhado. Ninguém na vila falava alto quando ela chegava.',
    'Mara apertou o cabo da lâmina. Fora do pai dela, e antes dele de um homem cujo nome ninguém lembrava. Diziam que a lâmina escolhia quem a carregava, e que nunca escolhia por bondade.',
    '— Você ainda pode voltar — disse o velho, sem olhar para ela. — A estrada só leva aonde você já decidiu ir.',
    'Ao longe, os sinos do vale tocaram **três vezes**, e todos os corvos levantaram voo ao mesmo tempo.'],
  'Romance': ['Helena releu a mensagem até as letras perderem o sentido. Quatro linhas, nenhuma assinatura, e mesmo assim ela soube quem tinha escrito.',
    'O café esfriava na mesa, e ela fingia ler o jornal enquanto a porta se abria e fechava a cada cliente que não era ele.',
    '— Você sempre chega cedo demais para as coisas que importam — disse ele, sentando à frente dela como se os anos não tivessem passado.',
    'Havia uma maneira educada de ir embora. Ela conhecia todas. Naquela tarde, não usou nenhuma.'],
  'Terror': ['A casa só respirava depois da meia-noite. Primeiro um sopro nas paredes, depois o ranger lento das tábuas, como se algo grande se virasse na cama.',
    'Paulo contou os degraus do porão pela terceira vez. Eram doze. Na noite anterior, eram onze.',
    'O espelho do corredor *não refletia* a porta do quarto. Refletia uma porta aberta e, atrás dela, só escuro.',
    'Do lado de dentro da parede, alguém bateu duas vezes, devagar, esperando resposta.'],
  'Ficção científica': ['A estação Órbita Nove completou mais uma volta ao redor de um planeta que ninguém ali via de perto havia onze anos.',
    'A IA de bordo repetiu o aviso com a voz calma de sempre: **o oxigênio estava dentro do limite**. Era a palavra "limite" que incomodava Lia.',
    'No painel, um sinal sem origem piscava a cada sete segundos. Alguém, em algum lugar, estava contando junto com eles.',
    '— Se a transmissão for real — disse o comandante —, ela veio de dentro da nossa própria nave.'],
  'Mistério': ['O maestro foi encontrado no camarim, com a partitura aberta na página que nunca tocava e o relógio parado às nove e quarenta.',
    'Inês anotou três detalhes no caderno: a janela trancada por dentro, a taça sem digitais e o cheiro de lavanda onde não havia flores.',
    '— Todo mundo mentiu um pouco — disse o delegado. — A pergunta é quem mentiu o suficiente.',
    'A chave estava no último lugar onde alguém procuraria: no bolso do próprio morto.'],
  'Aventura': ['O mapa estava rasgado justamente onde o rio se dividia, e Tiago precisou escolher entre duas margens que pareciam iguais.',
    'A corda rangeu sob o peso da mochila. Lá embaixo, o desfiladeiro engolia o som das pedras que caíam.',
    '— Se o vento virar antes do pôr do sol, atravessamos — gritou Dora. — Se não, rezamos.',
    'Do topo da duna, a cidade perdida apareceu inteira, dourada e muito mais viva do que qualquer um esperava.']
};
const TIT = ['O começo de tudo', 'Uma promessa quebrada', 'O que a noite escondeu', 'Cartas não enviadas', 'A travessia', 'Um velho conhecido', 'Sob a chuva', 'O preço da verdade', 'Antes do amanhecer', 'O último aviso', 'Portas fechadas', 'A volta para casa', 'Segredos à mesa', 'O silêncio depois'];
const COMENT = ['Não consegui parar de ler, preciso do próximo capítulo!', 'A atmosfera está perfeita. O final do capítulo me pegou de surpresa.', 'Os personagens têm voz própria. Estou torcendo muito por eles.',
  'Ritmo ótimo, parabéns ao autor.', 'Li tudo numa sentada. Quando sai o próximo?', 'Gostei de como o texto flui e das ilustrações.'];

// [título, gênero, autor, sinopse, nº capítulos, leituras, nº comentários, [a partir do cap., preço]]
const LIVROS = [
  ['A Última Chama de Eldoran', 'Fantasia', 0, 'Uma herdeira sem trono e uma lâmina que escolhe seus donos. Quando as brumas voltam ao vale, só ela lembra o que o reino esqueceu.', 24, 1840, 6],
  ['Coroa de Cinzas', 'Fantasia', 1, 'Três reinos, uma coroa queimada e um mensageiro que leu a carta errada.', 12, 920, 4],
  ['Cartas para o Mês de Maio', 'Romance', 2, 'Ela escreve cartas que nunca envia. Ele guarda todas, sem nunca ter recebido nenhuma.', 16, 1310, 5, [14, 1.99]],
  ['O Café da Rua Dezessete', 'Romance', 3, 'Uma cafeteria de esquina, um pedido que nunca muda e o cliente que resolve mudar tudo.', 6, 410, 2],
  ['A Casa que Respira', 'Terror', 1, 'A família achou a casa barata. Demorou onze noites para entenderem o porquê.', 18, 1575, 6, [15, 2.9]],
  ['Sussurros no Porão', 'Terror', 3, 'Todo prédio antigo guarda um segredo. Este guarda uma voz.', 5, 260, 1],
  ['Estação Órbita Nove', 'Ficção científica', 0, 'Onze anos em órbita, um sinal sem origem e uma tripulação que começa a desconfiar uns dos outros.', 14, 1120, 4],
  ['O Último Sinal', 'Ficção científica', 2, 'A Terra parou de responder. Resta um rádio, uma antena e uma escolha.', 3, 180, 1],
  ['Quem Matou o Maestro?', 'Mistério', 2, 'Um camarim trancado, doze suspeitos e uma partitura que ninguém sabia ler.', 11, 980, 3],
  ['Rota dos Ventos Perdidos', 'Aventura', 3, 'Um mapa rasgado, uma cidade que não consta em atlas algum e uma expedição sem volta garantida.', 8, 540, 2],
  ['O Arquivo Vazio', 'Mistério', 0, 'Capítulo um em breve.', 0, 0, 0]
];

const texto = (g, i, title) => {
  const p = TXT[g], a = [0, 1, 2].map(k => p[(i + k) % 4]);
  let t = a.slice(0, 2).join('\n\n') + (i % 3 === 0 ? '\n\n---\n\n' : '\n\n') + a[2];
  if (i === 1 && title.startsWith('A Última')) t += '\n\n![Mapa do Vale das Brumas](/uploads/demo-mapa.svg)'; // testa ilustração
  return t;
};

(async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (process.argv.includes('--limpar')) {
      const r = await c.query("DELETE FROM users WHERE email LIKE '%@demo.com'");
      await c.query('COMMIT'); return console.log(`Demo removida (${r.rowCount} usuários e tudo que dependia deles).`);
    }
    if ((await c.query("SELECT 1 FROM users WHERE email LIKE '%@demo.com' LIMIT 1")).rowCount) {
      await c.query('ROLLBACK'); return console.log('A demo já existe. Rode com --limpar para recriar.');
    }
    const up = path.join(__dirname, '..', 'public', 'uploads'); fs.mkdirSync(up, { recursive: true });
    fs.writeFileSync(path.join(up, 'demo-mapa.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><rect width="600" height="360" fill="#E9DDC2"/><path d="M40 300C140 220 180 320 270 230S420 150 470 70" fill="none" stroke="#8A6D3B" stroke-width="5" stroke-dasharray="12 10"/><path d="M60 80l60-30 70 40 50-50 80 50" fill="none" stroke="#5B6785" stroke-width="6"/><circle cx="470" cy="70" r="14" fill="#A65B58"/><text x="490" y="62" font-family="serif" font-size="22" fill="#3B2F1C">Eldoran</text></svg>');

    const hash = bcrypt.hashSync('demo123', 10);
    const novoUser = async (name, email) => (await c.query('INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id', [name, email, hash])).rows[0].id;
    const autores = [await novoUser('Helena Duarte', 'helena@demo.com'), await novoUser('Rafael Moura', 'rafael@demo.com'),
      await novoUser('Isadora Campos', 'isadora@demo.com'), await novoUser('Tiago Valente', 'tiago@demo.com')];
    const leitor = await novoUser('Leitor Demo', 'leitor@demo.com');
    const todos = [leitor, ...autores], dia = 864e5, agora = Date.now();
    let nCaps = 0;

    for (const [title, genre, ai, synopsis, n, reads, ncom, pago] of LIVROS) {
      const b = (await c.query('INSERT INTO books (author_id, title, synopsis, genre, reads, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [autores[ai], title, synopsis, genre, reads, new Date(agora - (n + 2) * 2 * dia)])).rows[0].id;
      for (let i = 0; i < n; i++, nCaps++) await c.query('INSERT INTO chapters (book_id, title, text, price, reads, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [b, TIT[(i + Number(b)) % TIT.length] + (i >= TIT.length ? ' II' : ''), texto(genre, i, title), pago && i + 1 >= pago[0] ? pago[1] : 0,
          Math.max(1, Math.round(reads / (i + 2))), new Date(agora - (n - i) * 2 * dia)]);
      for (let k = 0; k < ncom; k++) await c.query('INSERT INTO comments (user_id, book_id, text, created_at) VALUES ($1,$2,$3,$4)',
        [todos[(k + Number(b)) % todos.length], b, COMENT[(k + Number(b)) % COMENT.length], new Date(agora - k * dia)]);
    }

    // o Leitor Demo já comprou o primeiro capítulo pago de "A Casa que Respira"
    const cp = (await c.query(`SELECT c.id, c.price FROM chapters c JOIN books b ON b.id = c.book_id
      WHERE b.author_id = $1 AND b.title = 'A Casa que Respira' AND c.price > 0 ORDER BY c.id LIMIT 1`, [autores[1]])).rows[0];
    await c.query('INSERT INTO purchases (user_id, chapter_id, valor, plataforma) VALUES ($1,$2,$3,$4)', [leitor, cp.id, cp.price, +(cp.price * 0.2).toFixed(2)]);

    await c.query('COMMIT');
    console.log(`Demo criada: ${todos.length} usuários, ${LIVROS.length} livros, ${nCaps} capítulos. Senha: demo123`);
  } catch (e) { await c.query('ROLLBACK'); console.error('Falhou, nada foi gravado:', e.message); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();