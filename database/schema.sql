
-- USUÁRIOS
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LIVROS
CREATE TABLE books (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    synopsis TEXT DEFAULT '',
    genre VARCHAR(80) NOT NULL DEFAULT 'Outros',
    reads BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CAPÍTULOS
CREATE TABLE chapters (
    id BIGSERIAL PRIMARY KEY,
    book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    text TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    reads BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMPRAS
CREATE TABLE purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id BIGINT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    valor NUMERIC(10,2) NOT NULL,
    plataforma NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, chapter_id)
);

-- COMENTÁRIOS
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX idx_books_author ON books(author_id);
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_chapters_book ON chapters(book_id);
CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_chapter ON purchases(chapter_id);
CREATE INDEX idx_comments_book ON comments(book_id);
