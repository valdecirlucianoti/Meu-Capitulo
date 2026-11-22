# Meu Capítulo

**A chapter-based publishing platform for readers and independent writers.**

Meu Capítulo is a web platform designed to connect writers and readers through serialized books and chapter-based publications. Authors can create books, publish chapters, and organize their written content through a dedicated writing studio. Readers can explore stories and access published chapters.

---

## Features

### Authentication and User Accounts
- User registration and login.
- Session-based authentication.
- A single account for reading and publishing.
- Protected author and reader functionality.

### Book Management
- Create and manage books.
- Add book titles, descriptions, genres, and cover images.
- Organize chapters under individual books.
- Store book information in PostgreSQL.

### Chapter Management
- Create and publish chapters.
- Associate chapters with their respective books.
- Store chapter content in the database.
- Support existing plain-text chapter content.

### Writing Studio
- Block-based chapter editor.
- Heading blocks (H1, H2, H3).
- Paragraph and text blocks.
- Ordered and unordered lists.
- Step-by-step lists.
- Quote blocks.
- Informational, warning, success, and error callouts.
- Image blocks.
- Code blocks.
- Table blocks.
- Hyperlinks.
- Dividers and page breaks.
- Edit, duplicate, delete, and reorder content blocks.
- Chapter preview.
- Local draft saving.
- Image insertion through uploads and clipboard paste.
- Structured JSON content storage.

### Reading Experience
- Dedicated chapter reading interface.
- Support for previously stored plain-text chapters.
- Chapter-based book navigation.

### Purchases and Payments
- Chapter purchase management.
- Access control for purchased chapters.
- Payment integration structure.
- Platform commission configuration.

---

## Technology Stack

### Backend
- Node.js
- Express.js
- PostgreSQL
- EJS
- Express Session
- Multer

### Frontend
- HTML5
- CSS3
- JavaScript
- EJS Templates

### Database
- PostgreSQL
- Relational data structure for users, books, chapters, purchases, and comments.

---

## Project Structure

```text
meu-capitulo/
├── bin/
│   └── www
├── config/
│   └── database.js
├── lib/
│   └── render.js
├── public/
│   ├── javascripts/
│   │   ├── editor.js
│   │   └── reader.js
│   ├── stylesheets/
│   │   └── editor.css
│   └── uploads/
├── routes/
│   ├── author.js
│   ├── pay.js
│   └── ...
├── views/
│   ├── auth.ejs
│   ├── book.ejs
│   ├── dashboard.ejs
│   ├── form.ejs
│   ├── read.ejs
│   └── ...
├── app.js
├── db.js
├── helpers.js
├── package.json
└── .env
```

*The structure above represents the main application components and may vary as development continues.*

---

## Requirements

Before installing, make sure you have:

- Node.js
- npm
- PostgreSQL
- Git

---

## Installation

Clone the repository:

```bash
git clone YOUR_REPOSITORY_URL
```

Enter the project directory:

```bash
cd meu-capitulo
```

Install dependencies:

```bash
npm install
```

---

## Environment Configuration

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
SESSION_SECRET=your_secure_session_secret
```

Replace the values with your PostgreSQL connection details and a secure session secret.

**Important:** Never commit your `.env` file or expose database credentials.

---

## Database Setup

Create a PostgreSQL database and configure the connection string in `.env`.

Make sure the database schema is initialized before starting the application.

The application uses relational tables for:

- `users`
- `books`
- `chapters`
- `purchases`
- `comments`

---

## Running the Application

Start the application:

```bash
npm start
```

Open your browser and access:

```text
http://localhost:3000
```

---

## Development Status

Meu Capítulo is under active development.

Current development priorities include:

- Expanding and refining the writing studio interface.
- Improving the author experience.
- Enhancing the reading experience.
- Completing payment gateway integration.
- Validating payment webhooks.
- Improving session persistence.
- Further database and application optimization.

Some features and integrations may require additional implementation, configuration, and testing before production use.

---

## Security Notes

- Keep environment variables private.
- Use secure session configuration in production.
- Validate uploaded files and restrict allowed file types.
- Validate payment notifications and webhook signatures.
- Use HTTPS in production.
- Configure persistent session storage.
- Apply appropriate database access permissions.

---

## Contributing

Contributions, suggestions, and bug reports are welcome.

For substantial changes, consider creating a dedicated feature branch:

```bash
git switch -c feature/your-feature-name
```

---

## License

No license has been specified yet.

All rights and licensing terms should be defined by the project owner before public distribution.

---

**Meu Capítulo — Every story deserves a place to be told.**