
const router = require('express').Router();

const { query } = require('../db');
const { book, chap, auth } = require('../helpers');

const COMISSAO = 0.20;

// Registra uma compra no PostgreSQL.
// A restrição UNIQUE(user_id, chapter_id) evita duplicações.
async function liberar(userId, chapterId) {
  const result = await query(`
    INSERT INTO purchases (
      user_id,
      chapter_id,
      valor,
      plataforma
    )
    SELECT
      $1,
      id,
      price,
      ROUND(price * $3, 2)
    FROM chapters
    WHERE id = $2
      AND price > 0
    ON CONFLICT (user_id, chapter_id) DO NOTHING
    RETURNING id
  `, [userId, chapterId, COMISSAO]);

  return result.rowCount > 0;
}


// PÁGINA DE CHECKOUT
router.get('/checkout/:cid', auth, async (req, res, next) => {
  try {
    const c = await chap(req.params.cid);

    if (!c) return res.sendStatus(404);

    if (Number(c.price) <= 0) {
      return res.redirect('/read/' + c.id);
    }

    const b = await book(c.bookId);

    if (!b) return res.sendStatus(404);

    // O autor não precisa comprar o próprio capítulo.
    if (Number(b.authorId) === Number(res.locals.user.id)) {
      return res.redirect('/read/' + c.id);
    }

    // Verifica se já foi comprado.
    const compra = await query(`
      SELECT id
      FROM purchases
      WHERE user_id = $1 AND chapter_id = $2
    `, [res.locals.user.id, c.id]);

    if (compra.rowCount) {
      return res.redirect('/read/' + c.id);
    }

    res.render('checkout', {
      c,
      b,
      modoTeste: !process.env.MP_TOKEN
    });

  } catch (err) {
    next(err);
  }
});


// INICIAR PAGAMENTO
router.post('/checkout/:cid', auth, async (req, res, next) => {
  try {
    const c = await chap(req.params.cid);

    if (!c) return res.sendStatus(404);

    if (Number(c.price) <= 0) {
      return res.redirect('/read/' + c.id);
    }

    const b = await book(c.bookId);

    if (!b) return res.sendStatus(404);

    const user = res.locals.user;

    if (Number(b.authorId) === Number(user.id)) {
      return res.redirect('/read/' + c.id);
    }

    const compra = await query(`
      SELECT id
      FROM purchases
      WHERE user_id = $1 AND chapter_id = $2
    `, [user.id, c.id]);

    if (compra.rowCount) {
      return res.redirect('/read/' + c.id);
    }

    // MODO DE TESTE: libera sem pagamento real.
    if (!process.env.MP_TOKEN) {
      await liberar(user.id, c.id);
      return res.redirect('/read/' + c.id);
    }

    const base = process.env.BASE_URL || 'http://localhost:3000';

    const resposta = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.MP_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [{
            title: c.title,
            quantity: 1,
            unit_price: Number(c.price),
            currency_id: 'BRL'
          }],

          external_reference: user.id + ':' + c.id,

          notification_url: base + '/webhook',

          back_urls: {
            success: base + '/read/' + c.id,
            failure: base + '/book/' + c.bookId,
            pending: base + '/book/' + c.bookId
          },

          auto_return: 'approved'
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok || !dados.init_point) {
      console.error('Erro Mercado Pago:', dados);
      return res.status(502).send('Não foi possível iniciar o pagamento.');
    }

    res.redirect(dados.init_point);

  } catch (err) {
    next(err);
  }
});


// WEBHOOK DO MERCADO PAGO
router.post('/webhook', async (req, res) => {
  try {
    if (!process.env.MP_TOKEN) {
      return res.sendStatus(200);
    }

    const paymentId =
      req.body?.data?.id ||
      req.query['data.id'];

    if (!paymentId) {
      return res.sendStatus(400);
    }

    // Consulta o pagamento diretamente na API do Mercado Pago.
    const resposta = await fetch(
      'https://api.mercadopago.com/v1/payments/' +
      encodeURIComponent(paymentId),
      {
        headers: {
          Authorization: 'Bearer ' + process.env.MP_TOKEN
        }
      }
    );

    if (!resposta.ok) {
      console.error('Falha ao consultar pagamento:', await resposta.text());
      return res.sendStatus(502);
    }

    const pagamento = await resposta.json();

    // Só libera capítulos com pagamento aprovado.
    if (pagamento.status !== 'approved') {
      return res.sendStatus(200);
    }

    // Confere a referência enviada na criação do pagamento.
    const referencia = String(pagamento.external_reference || '');
    const partes = referencia.split(':');

    if (partes.length !== 2) {
      console.error('Referência de pagamento inválida.');
      return res.sendStatus(400);
    }

    const userId = Number(partes[0]);
    const chapterId = Number(partes[1]);

    if (!Number.isSafeInteger(userId) ||
        !Number.isSafeInteger(chapterId)) {
      return res.sendStatus(400);
    }

    // Confere o valor e a moeda antes de registrar a compra.
    const c = await chap(chapterId);

    if (!c || Number(c.price) <= 0) {
      return res.sendStatus(400);
    }

    if (
      pagamento.currency_id !== 'BRL' ||
      Math.abs(Number(pagamento.transaction_amount) - Number(c.price)) > 0.01
    ) {
      console.error('Valor ou moeda do pagamento não confere.');
      return res.sendStatus(400);
    }

    await liberar(userId, chapterId);

    return res.sendStatus(200);

  } catch (err) {
    console.error('Erro no webhook:', err);
    return res.sendStatus(500);
  }
});

module.exports = router;
