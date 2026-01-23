import path from 'node:path'
import {Pool} from 'pg';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { disconnect } from 'node:process';
import bcrypt from 'bcryptjs';
import {body, check, query, validationResult } from 'express-validator';
import { error } from 'node:console';
// import { localsName } from 'ejs';
const dirname = fileURLToPath(new URL('.', import.meta.url));
const filepath = join(dirname, 'views');
const assetsPath = join(dirname, '/public');




const pool = new Pool({
  host: 'localhost',
  user: 'anthonyauthier',
  database: 'messageboard',
  password: '082015',
  port: '5432'
});

const app = express();
app.use(express.static(assetsPath));

app.set("views", filepath);
app.set("view engine", "ejs");
app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
})
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
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, {message: 'Incorrect Password'})
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const {rows} = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = rows[0];

    done(null, user);
  } catch (err) {
    done(err);
  }
});


async function getMessages() {
  const {rows} = await pool.query('SELECT * FROM messages;');
  return rows;
}

// async function getName(user) {
//   const rows = await pool.query('SELECT fname,lname FROM users WHERE username = $1', [user]);
//   console.log(`rows: ${rows.rows}`);
// }

async function isMember(user) {
  if (user){
    const username = user.username
    const res = await pool.query('SELECT * FROM users WHERE username = $1;', [username]);
    const membership = res.rows[0].membership;
    if (membership === 'True') {
      // console.log('Membership', membership);
      return true
    } else {
      // console.log('membership', membership);
      return false
    }
  }
};


app.get("/", async (req, res) => res.render('index', 
  {
  user: req.user, 
  messages: await getMessages(),
  membership: await isMember(req.user)
}
));

app.get('/sign-up', (req, res) => res.render('sign-up-form'));

app.post('/sign-up', 
  body('username').notEmpty().isEmail().withMessage('Username must be an email'),
  body('password').isLength({min: 6}).withMessage('password must be at least 6 characters'),
  body('passwordConfirmation').custom((value, {req}) => {
    return value === req.body.password
  }).withMessage('passwords do not match'), 
  async (req, res, next) => {
    const errors = validationResult(req);

  try {
    if (errors.isEmpty()) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      await pool.query("INSERT INTO users (fname, lname, username, password) VALUES ($1, $2, $3, $4)", [
        req.body.fname,
        req.body.lname,
        req.body.username,
        hashedPassword
      ]);
      res.redirect('/');
    }
    else {
      const array = errors.errors;
      res.render('error', {array: array}, (err, ejs) => {
        res.send(ejs);
      })
    }
  } catch (err) {
    return next(err);
  }
});


app.post('/log-in', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login-error'
})
);


app.get('/log-out', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  })
})

app.listen(8080, (error) => {
  if (error) {
    throw error;
  }
  console.log("app listening on port 8080!");
});

app.get('/error', (req, res) => res.render('error'));

app.get('/login-error', (req, res) => res.render('login-error'));

app.post('/join', body('code').custom((value, {req}) => {
  const codeValue = 'Rohan calls for aid';
  return value === codeValue
}).withMessage('That is the incorrect membership code'), async (req, res, next) => {
  const errors = validationResult(req);

  try {
    if (errors.isEmpty()) {
      await pool.query("UPDATE users SET membership = 'True' WHERE username = $1", [
        req.body.username
      ])
      res.redirect('/members-only');
    } else {
      const array = errors.errors;
      res.render('error', {array: array}, (err, ejs) => {
        res.send(ejs);
      })
    }
  } catch (err) {
    return next(err);
  }

}
)

app.get('/members-only', (req, res) => {
  if (req.user && req.user.membership === 'True') {
    res.render('members-only');
  } else if (req.user && req.user.membership !== 'True') {
    res.redirect('/not-a-member');
  }
});

app.get('/test', (req, res) => {
  if (req.user) {
    res.render('test', {value: 'User is signed in', detail: `${req.user.username} is currently signed in`})
  } else {
    res.render('test', {value: 'user is not signed in', detail: 'no user is signed in'})
  }
});

app.get('/not-a-member', (req, res) => res.render('not-a-member'));

app.get('/message', (req, res) => {
  console.log(`user: ${req.user.username}`)
  res.render('message', {author: req.user.username})
} 
);


app.post('/message', async (req, res, next) => {
  const date = new Date(Date.now()).toLocaleDateString();

  try {
    await pool.query('INSERT INTO messages (title, time, text, author) VALUES ($1, $2, $3, $4);', [req.body.title, date, req.body.message, req.body.author]);
    console.log('message created');
    res.redirect('/');
  } catch (err) {
    return next(err);
  }
});
