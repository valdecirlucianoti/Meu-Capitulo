
const router = require('express').Router();

const { query } = require('../db');
const {
  GENEROS,
  FREE_LIMIT,
  book,
  chap,
  nameOf,
  chaptersOf,
  access
} = require('../helpers');

// VITRINE PÚBLICA
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        b.id,
        b.author_id AS "authorId",
        b.title,
        b.synopsis,
        b.genre,
        b.reads,
        u.name AS author,
        COUNT(DISTINCT c.id)::int AS n,
        COUNT(DISTINCT cm.id)::int AS comments
      FROM books b
      LEFT JOIN users u ON u.id = b.author_id
      LEFT JOIN chapters c ON c.book_id = b.id
      LEFT JOIN comments cm ON cm.book_id = b.id
      GROUP BY b.id, u.name
      ORDER BY b.id DESC
    `);

    const all = result.rows.map(b => ({
      ...b,
      genre: b.genre || 'Outros',
      reads: Number(b.reads) || 0,
      n: Number(b.n) || 0,
      comments: Number(b.comments) || 0,
      author: b.author || 'Autor desconhecido'
    }));

    const genero = req.query.genero || '';
    const busca = (req.query.q || '').trim();
    const s = busca.toLowerCase();

    const nomes = [...new Set([
      ...GENEROS,
      ...all.map(b => b.genre)
    ])].map(n => ({
      n,
      count: all.filter(b => b.genre === n).length
    }));

    const lista = all.filter(b =>
      (!genero || b.genre === genero) &&
      (!s || b.title.toLowerCase().includes(s))
    );

    const prateleiras = (genero || s)
      ? [[genero || 'Resultados', lista]]
      : nomes
          .filter(x => x.count)
          .map(x => [
            x.n,
            all.filter(b => b.genre === x.n)
          ]);

    res.render('index', {
      genero,
      busca,
      nomes,
      total: all.length,
      prateleiras,
      filtrado: !!(genero || s),
      FREE_LIMIT,

      maisLidos: [...all]
        .sort((a, b) => b.reads - a.reads)
        .slice(0, 5),

      maisCaps: [...all]
        .sort((a, b) => b.n - a.n)
        .slice(0, 5)
    });

  } catch (err) {
    next(err);
  }
});


// PÁGINA DO LIVRO
router.get('/book/:id', async (req, res, next) => {
  try {
    const b = await book(req.params.id);

    if (!b) return res.sendStatus(404);

    const author = await nameOf(b);
    const chapters = await chaptersOf(b.id);

    const chaptersWithAccess = await Promise.all(
      chapters.map(async c => ({
        ...c,
        acc: await access(res.locals.user, c)
      }))
    );

    res.render('book', {
      b,
      author,
      reads: Number(b.reads) || 0,
      FREE_LIMIT,
      chapters: chaptersWithAccess
    });

  } catch (err) {
    next(err);
  }
});


// LEITURA DE CAPÍTULO
router.get('/read/:cid', async (req, res, next) => {
  try {
    const c = await chap(req.params.cid);

    if (!c) return res.sendStatus(404);

    const b = await book(c.bookId);

    if (!b) return res.sendStatus(404);

    const acc = await access(res.locals.user, c);

    // Capítulo pago
    if (acc === 'pagar') {
      return res.redirect('/checkout/' + c.id);
    }

    // Precisa fazer login
    if (acc === 'login') {
      req.session.returnTo = req.originalUrl;

      const result = await query(`
        SELECT
          b.id,
          b.title,
          b.synopsis,
          b.genre,
          b.reads,
          u.name AS author
        FROM books b
        LEFT JOIN users u ON u.id = b.author_id
        WHERE b.id <> $1
        ORDER BY
          (b.genre = $2) DESC,
          b.reads DESC
        LIMIT 4
      `, [b.id, b.genre]);

      const outros = result.rows.map(x => ({
        ...x,
        author: x.author || 'Autor desconhecido'
      }));

      return res.render('gate', {
        c,
        b,
        outros,
        FREE_LIMIT
      });
    }

    if (acc !== 'ok') {
      return res.sendStatus(403);
    }

    // Contabiliza as leituras diretamente no PostgreSQL.
    await query(`
      UPDATE books
      SET reads = reads + 1
      WHERE id = $1
    `, [b.id]);

    await query(`
      UPDATE chapters
      SET reads = reads + 1
      WHERE id = $1
    `, [c.id]);

    // Busca os capítulos para montar a navegação.
    const chapters = await chaptersOf(b.id);

    const ids = chapters.map(x => Number(x.id));
    const i = ids.indexOf(Number(c.id));

    res.render('read', {
      c,
      b,
      num: i + 1,
      total: ids.length,
      prev: ids[i - 1],
      next: ids[i + 1]
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
