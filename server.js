require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const methodOverride = require('method-override');

const { attachSession } = require('./middleware/auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Stateless auth: verifies the Supabase session cookie on every request
// (works the same locally and on Vercel serverless — no server memory).
app.use(attachSession);

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).send('Page not found. <a href="/">Return home</a>');
});

// Basic error handler so a Supabase/network hiccup shows a message
// instead of a raw stack trace in production.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong loading this page. Please try again in a moment.');
});

// Vercel imports this file as a serverless function (module.exports = app);
// running it directly with `node server.js` / `npm start` still works locally.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cesar Botello Customs site running at http://localhost:${PORT}`);
    console.log(`Admin dashboard at http://localhost:${PORT}/admin/login`);
  });
}

module.exports = app;
