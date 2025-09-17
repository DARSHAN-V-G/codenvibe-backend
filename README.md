
# codenvibe-backend

## API Documentation

### Authentication Routes

| Method | Endpoint           | Description                | Status |
|--------|--------------------|----------------------------|--------|
| POST   | /request-login     | Request login (OTP based)  | Pravith |
| POST   | /verify-otp        | Verify OTP                 | pravith |

### Admin Routes (Protected)

| Method | Endpoint           | Description                | Status |
|--------|--------------------|----------------------------|--------|
| POST   | /add-team          | Add a new team             | Pravith|
| GET    | /teams             | Get all teams              | Pravith |
| DELETE | /remove-team       | Remove a team              | Pravith |

---

## Debugging Portal API

### Question Management
| Method | Endpoint                | Description                                 | Status |
|--------|------------------------|---------------------------------------------|--------|
| GET    | /questions/:year       | Get all questions for a specific year       |  |
| POST   | /questions             | Add a new question (admin only)             | |
| PUT    | /questions/:id         | Update a question (admin only)              |  |
| DELETE | /questions/:id         | Delete a question (admin only)              |  |

### Team Management
| Method | Endpoint                | Description                                 | Status |
|--------|------------------------|---------------------------------------------|--------|
| GET    | /teams/:year           | Get all teams for a specific year           |  |
| POST   | /teams                  | Register a new team                         | |
| PUT    | /teams/:id              | Update team details                         |  |
| DELETE | /teams/:id              | Remove a team                               |  |

### Submission & Scoring
| Method | Endpoint                        | Description                                         | Status |
|--------|----------------------------------|-----------------------------------------------------|--------|
| POST   | /submit/:questionId              | Submit solution for a question                      |  |
| GET    | /submissions/:teamId             | Get all submissions by a team                       |  |
| GET    | /score/:teamId                   | Get current score and ranking for a team            |  |

#### Scoring Logic
- Points are awarded based on the number of test cases passed per question.
- Bonus points for early submissions (timestamp-based).
- Leaderboard ranks teams by total points and submission time.

### Year-Based Question Sets
- `/questions/1` — Questions for 1st year
- `/questions/2` — Questions for 2nd year
- `/questions/3` — Questions for 3rd year

---


