import { Pool } from "pg";

const pool = new Pool({
  host: 'localhost',
  user: 'anthonyauthier',
  database: 'messageboard',
  password: '082015',
  port: '5432'
})

async function isMember(user) {
  const member = await pool.query('SELECT membership FROM users WHERE username = $1', [user]);
}