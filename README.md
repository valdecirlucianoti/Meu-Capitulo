# Meu Capítulo
Plataforma onde qualquer pessoa publica livros em capítulos e vende cada capítulo.

    npm install
    cp .env.example .env   # opcional; sem MP_TOKEN o pagamento é simulado
    npm start   # node ./bin/www -> http://localhost:3000

Fluxo: cadastro → "Minha área" → novo livro → novo capítulo (preço) → leitor compra → capítulo liberado.
Pagamento real: defina MP_TOKEN (Mercado Pago, credencial de teste) e BASE_URL pública (para o webhook).
Pendente para produção: banco real (db.js é JSON), split automático autor/plataforma (COMISSAO apenas registra), upload de capa, edição/exclusão.
