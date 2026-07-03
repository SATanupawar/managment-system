import { signToken } from '../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;

  if (
    username === process.env.HR_USERNAME &&
    password === process.env.HR_PASSWORD
  ) {
    const token = signToken({ username, role: 'hr' });
    return res.status(200).json({ token, username });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
}
