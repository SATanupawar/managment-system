import connectDB from '../lib/mongodb';
import { Vacancy } from '../lib/models';
import { authMiddleware } from '../lib/auth';

export default async function handler(req, res) {
  const user = authMiddleware(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  if (req.method === 'GET') {
    const vacancies = await Vacancy.find().sort({ createdAt: -1 });
    return res.status(200).json(vacancies);
  }

  if (req.method === 'POST') {
    const vacancy = await Vacancy.create(req.body);
    return res.status(201).json(vacancy);
  }

  if (req.method === 'PUT') {
    const { id, ...data } = req.body;
    const vacancy = await Vacancy.findByIdAndUpdate(id, data, { new: true });
    return res.status(200).json(vacancy);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await Vacancy.findByIdAndDelete(id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
