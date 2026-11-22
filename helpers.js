
const { query } = require('./db');

const FREE_LIMIT = 10;

const GENEROS = [
  'Fantasia',
  'Romance',
  'Terror',
  'Ficção científica',
  'Mistério',
  'Aventura',
  'Drama',
  'Outros'
];

async function book(id) {
  const { rows } = await query(`
    SELECT
      id,
      author_id AS "authorId",
      title,
      synopsis,
      genre,
      reads
    FROM books
    WHERE id = $1
  `, [id]);

  return rows[0] || null;
}

async function chap(id) {
  const { rows } = await query(`
    SELECT
      id,
      book_id AS "bookId",
      title,
      text,
      price,
      reads,
      created_at AS at
    FROM chapters
    WHERE id = $1
  `, [id]);

  return rows[0] || null;
}

async function nameOf(b) {
  const { rows } = await query(
    'SELECT name FROM users WHERE id = $1',
    [b.authorId]
  );

  return rows[0]?.name || 'Autor desconhecido';
}

async function chaptersOf(bookId) {
  const { rows } = await query(`
    SELECT
      id,
      book_id AS "bookId",
      title,
      text,
      price,
      reads,
      created_at AS at
    FROM chapters
    WHERE book_id = $1
    ORDER BY id ASC
  `, [bookId]);

  return rows;
}

async function numberOf(c) {
  const { rows } = await query(`
    SELECT COUNT(*)::int AS total
    FROM chapters
    WHERE book_id = $1 AND id <= $2
  `, [c.bookId, c.id]);

  return rows[0].total;
}

async function access(user, c) {
  const b = await book(c.bookId);

  if (!b) return 'negado';

  // O autor pode ler todos os próprios capítulos.
  if (user && Number(b.authorId) === Number(user.id)) {
    return 'ok';
  }

  // Capítulo comprado.
  if (user) {
    const compra = await query(`
      SELECT id
      FROM purchases
      WHERE user_id = $1 AND chapter_id = $2
    `, [user.id, c.id]);

    if (compra.rowCount) return 'ok';
  }

  // Capítulo pago.
  if (Number(c.price) > 0) return 'pagar';

  // Capítulos gratuitos.
  if (user || await numberOf(c) <= FREE_LIMIT) {
    return 'ok';
  }

  return 'login';
}

function auth(req, res, next) {
  if (res.locals.user) return next();

  if (req.method === 'GET') {
    req.session.returnTo = req.originalUrl;
  }

  res.redirect('/login');
}

module.exports = {
  FREE_LIMIT,
  GENEROS,
  book,
  chap,
  nameOf,
  chaptersOf,
  numberOf,
  access,
  auth
};
