
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { query } = require('../db');
const { GENEROS, auth } = require('../helpers');

const dir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(dir, { recursive: true });

const EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

const up = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => {
      const nome = Date.now() + '-' +
        Math.random().toString(36).slice(2, 8) +
        EXT[file.mimetype];

      cb(null, nome);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    cb(new Error('Formato inválido. Envie PNG, JPG, GIF ou WEBP.'));
  }
});

// Remove arquivo caso o cadastro não seja concluído
async function apagarArquivo(file) {
  if (!file) return;

  try {
    await fs.promises.unlink(file.path);
  } catch (err) {
    console.error('Não foi possível remover o arquivo:', err.message);
  }
}

// Área do autor
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        b.id,
        b.title,
        b.synopsis,
        b.genre,
        b.cover_url,
        b.reads,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'bookId', c.book_id,
              'title', c.title,
              'price', c.price,
              'reads', c.reads
            ) ORDER BY c.id
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS chapters
      FROM books b
      LEFT JOIN chapters c ON c.book_id = b.id
      WHERE b.author_id = $1
      GROUP BY b.id
      ORDER BY b.id DESC
    `, [res.locals.user.id]);

    res.render('dashboard', {
      books: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// Formulário de novo livro
router.get('/books/new', auth, (req, res) => {
  res.render('form', {
    kind: 'book',
    generos: GENEROS,
    msg: ''
  });
});

// Criar livro com capa
router.post('/books', auth, (req, res, next) => {
  up.single('capa')(req, res, async err => {
    if (err) {
      return res.status(400).render('form', {
        kind: 'book',
        generos: GENEROS,
        msg: err.message
      });
    }

    try {
      const title = (req.body.title || '').trim();
      const synopsis = (req.body.synopsis || '').trim();
      const genre = req.body.genre || 'Outros';

      if (!title) {
        await apagarArquivo(req.file);

        return res.status(400).render('form', {
          kind: 'book',
          generos: GENEROS,
          msg: 'O título do livro é obrigatório.'
        });
      }

      if (!req.file) {
        return res.status(400).render('form', {
          kind: 'book',
          generos: GENEROS,
          msg: 'Envie uma imagem para a capa do livro.'
        });
      }

      const coverUrl = '/uploads/' + req.file.filename;

      await query(`
        INSERT INTO books (
          author_id,
          title,
          synopsis,
          genre,
          cover_url
        )
        VALUES ($1, $2, $3, $4, $5)
      `, [
        res.locals.user.id,
        title,
        synopsis,
        genre,
        coverUrl
      ]);

      res.redirect('/dashboard');
    } catch (err) {
      await apagarArquivo(req.file);
      next(err);
    }
  });
});

// Formulário de novo capítulo
router.get('/books/:id/chapters/new', auth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, title
      FROM books
      WHERE id = $1 AND author_id = $2
    `, [req.params.id, res.locals.user.id]);

    const book = result.rows[0];

    if (!book) return res.sendStatus(404);

    res.render('form', {
      kind: 'chapter',
      book
    });
  } catch (err) {
    next(err);
  }
});

// Criar capítulo
router.post('/books/:id/chapters', auth, async (req, res, next) => {
  try {
    const bookId = req.params.id;
    const title = (req.body.title || '').trim();
    const text = req.body.text || '';
    const price = req.body.price === '' || req.body.price == null
      ? 0
      : Number(req.body.price);

    if (!title || !text.trim()) {
      return res.status(400).send(
        'Título e texto do capítulo são obrigatórios.'
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).send('Preço inválido.');
    }

    const result = await query(`
      SELECT id
      FROM books
      WHERE id = $1 AND author_id = $2
    `, [bookId, res.locals.user.id]);

    if (!result.rowCount) return res.sendStatus(403);

    await query(`
      INSERT INTO chapters (book_id, title, text, price)
      VALUES ($1, $2, $3, $4)
    `, [bookId, title, text, price]);

    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

// Upload de ilustrações dos capítulos
router.post('/upload', auth, (req, res, next) => {
  up.single('imagem')(req, res, err => {
    if (err) {
      return res.status(400).json({
        erro: err.message || 'Falha no envio da imagem.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        erro: 'Envie PNG, JPG, GIF ou WEBP de até 5 MB.'
      });
    }

    res.json({
      url: '/uploads/' + req.file.filename
    });
  });
});

module.exports = router;
