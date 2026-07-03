import { signToken } from '../../lib/auth';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { username, password } = req.body || {};
    
    const envUser = (process.env.HR_USERNAME || '').trim();
    const envPass = (process.env.HR_PASSWORD || '').trim();
    
    // TEMPORARY - delete after fix
    if (process.env.NODE_ENV !== 'production') {
      console.log('ENV USER:', envUser, 'ENV PASS:', envPass);
    }
    
    // HARDCODE TEST - remove after working
    if (username === 'snehasatyampawar@gmail.com' && password === '16032024') {
      const token = signToken({ username, role: 'hr' });
      return res.status(200).json({ token, username });
    }
    
    if (String(username).trim() === envUser && password === envPass) {
      const token = signToken({ username, role: 'hr' });
      return res.status(200).json({ token, username });
    }
    
    return res.status(401).json({ error: 'Invalid email or password' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}