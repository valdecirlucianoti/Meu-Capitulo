
const express = require('express');
const path = require('path');
const logger = require('morgan');
const session = require('express-session');
const { query } = require('./db');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.locals.hue = t =>
  [...t].reduce((a, c) => a + c.charCodeAt(0) * 31, 7) % 360;

app.locals.texto = require('./lib/render');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'segredo-local-temporario',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// Carrega o usuário da sessão no PostgreSQL.
app.use(async (req, res, next) => {
  try {
    res.locals.user = null;
    res.locals.msg = '';

    if (req.session.uid) {
      const { rows } = await query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [req.session.uid]
      );

      res.locals.user = rows[0] || null;

      if (!res.locals.user) {
        delete req.session.uid;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/author'));
app.use('/', require('./routes/pay'));

app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Página não encontrada',
    status: 404
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).render('error', {
    message: 'Ocorreu um erro interno.',
    status: err.status || 500
  });
});

module.exports = app;
