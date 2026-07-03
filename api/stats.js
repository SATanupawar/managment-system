import connectDB from '../lib/mongodb';
import { Candidate, Vacancy } from '../lib/models';
import { authMiddleware } from '../lib/auth';

export default async function handler(req, res) {
  const user = authMiddleware(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  const [
    totalCandidates,
    totalVacancies,
    openVacancies,
    interviewScheduled,
    selected,
    rejected,
    todayInterviews,
    recentCandidates,
  ] = await Promise.all([
    Candidate.countDocuments(),
    Vacancy.countDocuments(),
    Vacancy.countDocuments({ status: 'Open' }),
    Candidate.countDocuments({ status: 'Interview Scheduled' }),
    Candidate.countDocuments({ status: 'Selected' }),
    Candidate.countDocuments({ status: 'Rejected' }),
    Candidate.countDocuments({
      interviewDate: {
        $gte: new Date(new Date().setHours(0,0,0,0)),
        $lt:  new Date(new Date().setHours(23,59,59,999)),
      },
    }),
    Candidate.find().sort({ createdAt: -1 }).limit(5).populate('vacancyId', 'title'),
  ]);

  return res.status(200).json({
    totalCandidates,
    totalVacancies,
    openVacancies,
    interviewScheduled,
    selected,
    rejected,
    todayInterviews,
    recentCandidates,
  });
}
