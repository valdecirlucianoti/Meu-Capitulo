
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');

const back = req => {
  const destination = req.session.returnTo || '/dashboard';
  delete req.session.returnTo;
  return destination;
};

// Página de cadastro
router.get('/register', (req, res) => {
  res.render('auth', { mode: 'register', msg: '' });
});

// Cadastro
router.post('/register', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!name || !email || password.length < 6) {
      return res.status(400).render('auth', {
        mode: 'register',
        msg: 'Preencha todos os campos. A senha deve ter pelo menos 6 caracteres.'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await query(`
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, name, email
    `, [name, email, hash]);

    if (!result.rowCount) {
      return res.status(409).render('auth', {
        mode: 'register',
        msg: 'E-mail já cadastrado.'
      });
    }

    const user = result.rows[0];

    req.session.uid = user.id;

    req.session.save(err => {
      if (err) return next(err);
      res.redirect(back(req));
    });

  } catch (err) {
    next(err);
  }
});

// Página de login
router.get('/login', (req, res) => {
  res.render('auth', { mode: 'login', msg: '' });
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    const result = await query(`
      SELECT id, name, email, password_hash
      FROM users
      WHERE email = $1
    `, [email]);

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).render('auth', {
        mode: 'login',
        msg: 'E-mail ou senha inválidos.'
      });
    }

    req.session.uid = user.id;

    req.session.save(err => {
      if (err) return next(err);
      res.redirect(back(req));
    });

  } catch (err) {
    next(err);
  }
});

// Logout
router.get('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);

    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;
