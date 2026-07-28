# 🇨🇦 Canada Immigration Tracker

A full-stack web application that helps people track their Canadian immigration progress and estimate processing times using community-contributed data.

## 🌎 About

Waiting for immigration decisions can be stressful because official processing times are often broad estimates and don't reflect individual cases.

Canada Immigration Tracker aims to make the process more transparent by allowing users to:

- Create an account
- Track their immigration progress
- Save important milestones
- Estimate future timelines based on real community data
- Compare processing times with similar applicants

The project currently focuses on the **Manitoba Provincial Nominee Program (MPNP)** and is designed to expand to other Canadian immigration pathways.

---

## ✨ Planned Features

### User Accounts
- Secure registration
- Login authentication
- Encrypted passwords
- Personal dashboard

### Immigration Tracking
- Record immigration stages
- Edit completed milestones
- Track progress visually
- Timeline history

### Community Statistics
- Anonymous timeline contributions
- Average processing times
- Interactive charts
- Estimated wait times

### Future Features
- Multiple immigration programs
- Notifications
- Mobile-friendly design
- Admin dashboard
- AI-powered timeline predictions

---

## 🛠 Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose

### Authentication
- JWT
- bcrypt

### Deployment
- GitHub
- Render

---

## 📂 Project Structure

```
CanadaImmigration/
│
├── public/
│   ├── index.html
│   ├── about.html
│   ├── aboutdev.html
│   ├── auth.html
│   ├── dashboard.html
│   └── style.css
│
├── models/
├── routes/
├── controllers/
├── middleware/
├── config/
├── utils/
│
├── server.js
├── package.json
├── .env
└── README.md
```

---

## 🚀 Getting Started

Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/canada-immigration-tracker.git
```

Install dependencies

```bash
npm install
```

Create a `.env` file

```env
PORT=3000
MONGODB_URI=your_connection_string
JWT_SECRET=your_secret_key
```

Run the development server

```bash
npm run dev
```

Open

```
http://localhost:3000
```

---

## 📈 Roadmap

- [x] Website UI
- [x] Express server
- [x] MongoDB Atlas setup
- [ ] Database connection
- [ ] User authentication
- [ ] User dashboard
- [ ] Timeline tracking
- [ ] Community statistics
- [ ] Admin panel
- [ ] Production deployment

---

## 📜 License

This project is intended for educational and portfolio purposes.

---

Developed by **Seungyun Lim**