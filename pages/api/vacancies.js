import connectDB from '../../lib/mongodb';
import { Vacancy, Candidate } from '../../lib/models';
import { authMiddleware } from '../../lib/auth';

export default async function handler(req, res) {
  try {
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
      if (!id) return res.status(400).json({ error: 'Vacancy id is required' });

      const vacancy = await Vacancy.findByIdAndUpdate(id, data, { new: true, runValidators: true });
      if (!vacancy) return res.status(404).json({ error: 'Vacancy not found' });
      return res.status(200).json(vacancy);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Vacancy id is required' });

      await Candidate.updateMany({ vacancyId: id }, { $unset: { vacancyId: 1 } });
      await Vacancy.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Vacancies API error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
