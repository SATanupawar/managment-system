# HireFlow HR System — Setup Guide

## What files are included?
```
hr-recruitment/
├── index.html          ← Demo preview (opens in browser)
├── package.json        ← Next.js dependencies
├── next.config.js      ← Next.js config
├── .env.local.example  ← Env variables template
├── lib/
│   ├── mongodb.js      ← DB connection
│   ├── models.js       ← Candidate + Vacancy schemas
│   ├── auth.js         ← JWT login
│   └── cloudinary.js   ← CV upload
├── api/
│   ├── login.js        ← POST /api/login
│   ├── candidates.js   ← GET/POST/PUT/DELETE /api/candidates
│   ├── vacancies.js    ← GET/POST/PUT/DELETE /api/vacancies
│   └── stats.js        ← GET /api/stats
└── SETUP_GUIDE.md      ← This file
```

---

## STEP 1 — MongoDB Atlas Free Cluster

1. https://mongodb.com/cloud/atlas → Sign Up
2. "Create a Cluster" → Select **M0 Free**
3. Set a username and password (save them securely!)
4. Network Access → Add IP → **0.0.0.0/0** (anywhere)
5. Connect → "Connect your application" → Copy the connection string:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/hr_recruitment
   ```

---

## STEP 2 — Cloudinary Free Account

1. https://cloudinary.com → Sign Up Free
2. On the Dashboard:
   - Copy **Cloud Name**
   - Copy **API Key**
   - Copy **API Secret**

---

## STEP 3 — Vercel Deploy

1. Create a new GitHub repo: `hr-recruitment`
2. Upload all these files
3. https://vercel.com → Import GitHub repo
4. Add **Environment Variables** (Settings → Environment Variables):

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster...` |
| `JWT_SECRET` | `any-random-long-string-123` |
| `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | `your_api_key` |
| `CLOUDINARY_API_SECRET` | `your_api_secret` |
| `HR_USERNAME` | `hr@yourcompany.com` |
| `HR_PASSWORD` | `YourPassword123` |

5. Deploy!

---

## STEP 4 — Local Testing (optional)

```bash
npm install
cp .env.local.example .env.local
# Add your credentials in .env.local
npm run dev
# Open http://localhost:3000
```

---

## System Features

| Feature | Description |
|---------|-------------|
| 🔐 Login | Email + Password (JWT token, 8 hours session) |
| 👤 Candidates | Add/Edit/Delete, CV upload (PDF), status track |
| 💼 Vacancies | Add job openings and link candidates |
| 📅 Interviews | Schedule date/time, mode (In-Person/Phone/Video) |
| 🎉 Joining | Selected candidates, joining date, confirm |
| 📊 Dashboard | Stats overview, recent candidates |
| ⬇ CV Download | Stored safely on Cloudinary, direct download link |

---

## MongoDB Collections

### candidates
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@email.com",
  "phone": "9876543210",
  "position": "Software Engineer",
  "vacancyId": "ObjectId",
  "resumeUrl": "https://res.cloudinary.com/.../resume.pdf",
  "status": "Interview Scheduled",
  "interviewDate": "2025-02-15T00:00:00Z",
  "interviewTime": "10:30",
  "interviewMode": "In-Person",
  "joiningDate": "2025-03-01T00:00:00Z",
  "joiningConfirmed": false,
  "notes": "Strong candidate"
}
```

### vacancies
```json
{
  "title": "Software Engineer",
  "department": "Engineering",
  "location": "Mumbai",
  "type": "Full-Time",
  "openings": 2,
  "salary": "₹8-15 LPA",
  "status": "Open",
  "description": "...",
  "requirements": "..."
}
```

---

## After you provide the connection string, API calls can be connected in the pages.

Once connected, the frontend demo will become a fully working app with a real backend.
