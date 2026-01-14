import path from 'node:path'
import {Pool} from 'pg';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dirname = fileURLToPath(new URL('.', import.meta.url));
const filepath = join(dirname, 'views');




const pool = new Pool({
  host: 'localhost',
  user: 'anthonyauthier',
  database: 'auth',
  password: '082015',
  port: '5432'
});

const app = express();
app.set("views", filepath);
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const {rows} = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      const user = rows[0];

      if (!user) {
        return done(null, false, {message: 'Incorrect Username'});
      }
      if (user.password !== password) {
        return done(null, false, {message: 'Incorrect Password'});
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);


app.get("/", (req, res) => res.render("index"));
app.get('/sign-up', (req, res) => res.render('sign-up-form'));
app.post('/sign-up', async (req, res, next) => {
  try {
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
      req.body.username,
      req.body.password,
    ]);
    res.redirect('/');
  } catch (err) {
    return next(err);
  }
})

app.listen(3000, (error) => {
  if (error) {
    throw error;
  }
  console.log("app listening on port 3000!");
});