# codenvibe-backend API Documentation

## Authentication Routes

### Team Authentication

### POST `/auth/request-login`
**Description:** Request login OTP for a team member.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
- Success:  
  ```json
  {
    "success": true,
    "message": "OTP sent successfully to all team members"
  }
  ```
- Error:  
  ```json
  {
    "success": false,
    "message": "Email is required"
  }
  ```

---

### POST `/auth/verify-otp`
**Description:** Verify OTP and login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
- Success:  
  ```json
  {
    "success": true,
    "team": {
      "team_name": "Team Name",
      "roll_nos": ["roll1", "roll2"],
      "emails": ["user1@example.com", "user2@example.com"]
    }
  }
  ```
- Error:  
  ```json
  {
    "success": false,
    "message": "Invalid OTP"
  }
  ```

---

### GET `/questions/:id/logs`
**Description:** Get submission logs for a specific question for the authenticated user.

**Authentication Required:** Yes (requires user JWT token)

**URL Parameters:**
- `id`: Question ID (MongoDB ObjectId)

**Response:**
- Success:  
  ```json
  {
    "logs": [
      {
        "submissionid": "submission_id",
        "message": "Submission attempt details",
        "createdAt": "2025-09-19T10:00:00Z",
        "testcase_results": [...]
      }
    ],
    "submission": {
      "testcases_passed": 3,
      "all_passed": false,
      "syntax_error": false,
      "wrong_submission": true
    }
  }
  ```
- Error:  
  ```json
  {
    "error": "User ID not found in request. Make sure you are authenticated."
  }
  ```

---

## Admin Authentication Routes

### POST `/admin/auth/register`
**Description:** Register a new admin account.

**Request Body:**
```json
{
  "username": "adminuser",
  "email": "admin@example.com",
  "password": "securepassword123"
}
```

**Response:**
- Success:  
  ```json
  {
    "message": "Admin registered successfully",
    "admin": {
      "username": "adminuser",
      "email": "admin@example.com"
    }
  }
  ```
- Error:  
  ```json
  {
    "error": "Username or email already exists."
  }
  ```

---

### POST `/admin/auth/login`
**Description:** Login as an admin.

**Request Body:**
```json
{
  "username": "adminuser",
  "password": "securepassword123"
}
```

**Response:**
- Success:  
  ```json
  {
    "message": "Login successful"
  }
  ```
- Error:  
  ```json
  {
    "error": "Invalid credentials."
  }
  ```

**Note:** Sets `codenvibe_admin_token` cookie on successful login.

---

### POST `/admin/auth/logout`
**Description:** Logout admin account.

**Response:**
- Success:  
  ```json
  {
    "message": "Logout successful"
  }
  ```

**Note:** Clears `codenvibe_admin_token` cookie.

---

### GET `/question/all`
**Description:** Get all questions (admin access only).

**Response:**
- Success:  
  ```json
  {
    "success": true,
    "questions": [
      {
        "year": 1,
        "number": 1,
        "correct_code": "...",
        "incorrect_code": "...",
        "test_cases": [
          {
            "input": "input1",
            "expectedOutput": "output1"
          }
        ]
      }
    ]
  }
  ```
- Error:  
  ```json
  {
    "success": false,
    "error": "Admin authentication required."
  }
  ```

**Note:** Requires valid admin authentication via `codenvibe_admin_token` cookie.

---

## Admin Routes (Protected)

### GET `/admin/logs`
**Description:** Get server logs (admin access only)

**Query Parameters:**
```json
{
  "type": "combined|error",  // optional, defaults to "combined"
  "lines": 1000             // optional, defaults to 1000
}
```

**Response:**
- Success (JSON):  
  ```json
  [
    {
      "timestamp": "2024-01-01T00:00:00.000Z",
      "level": "info|error|warn|debug",
      "message": "Log message",
      "context": { ... }  // optional
    }
  ]
  ```
- Success (HTML):  
  Returns an interactive HTML page with log viewer if `Accept: text/html` header is present

- Error:  
  ```json
  {
    "error": "Failed to retrieve logs",
    "details": "Error message"
  }
  ```

**Note:** 
- Requires admin authentication via `codenvibe_admin_token` cookie
- Can return either JSON or HTML format based on Accept header

---

### POST `/admin/add-team`
**Description:** Add a new team.

**Request Body:**
```json
{
  "team_name": "Team Name",
  "roll_nos": ["roll1", "roll2"],
  "emails": ["user1@example.com", "user2@example.com"],
  "year": 1,
  "members": ["Member1", "Member2"]
}
```

**Response:**
- Success:  
  ```json
  {
    "message": "User added successfully",
    "user": { ...team object... }
  }
  ```
- Error:  
  ```json
  {
    "success": false,
    "message": "Error adding teams"
  }
  ```

---

### GET `/admin/teams`
**Description:** Get all teams.

**Response:**
- Success:  
  ```json
  {
    "success": true,
    "teams": [
      {
        "team_name": "Team Name",
        "roll_nos": ["roll1", "roll2"],
        "emails": ["user1@example.com", "user2@example.com"]
      }
    ]
  }
  ```
- Error:  
  ```json
  {
    "success": false,
    "message": "Error retrieving teams"
  }
  ```

---

### DELETE `/admin/remove-team`
**Description:** Remove a team.

**Request Body:**
```json
{
  "team_name": "Team Name"
}
```

**Response:**
- Success:  
  ```json
  {
    "success": true,
    "message": "Team removed successfully"
  }
  ```
- Error:  
  ```json
  {
    "success": false,
    "message": "Team not found"
  }
  ```

---

## Question Routes

### POST `/question/add`
**Description:** Add a new question.

**Request Body:**
```json
{
  "year": 1,
  "number": 1,
  "title": "Question Title",
  "description": "Question Description",
  "correct_code": "print('Hello')",
  "incorrect_code": "print('Hi')",
  "test_cases": [
    { "input": "input1", "expectedOutput": "output1" }
  ]
}
```

**Response:**
- Success:  
  ```json
  { ...question object... }
  ```
- Error:  
  ```json
  {
    "error": "Missing or invalid required fields: year, correct_code, incorrect_code, test_cases"
  }
  ```

---

### PUT `/question/update/:id`
**Description:** Update a question.

**Request Body:** (any subset of fields)
```json
{
  "year": 1,
  "correct_code": "print('Hello')",
  "incorrect_code": "print('Hi')",
  "test_cases": [
    { "input": "input1", "expectedOutput": "output1" }
  ]
}
```

**Response:**
- Success:  
  ```json
  { ...updated question object... }
  ```
- Error:  
  ```json
  {
    "error": "Question not found"
  }
  ```

---

### POST `/question/check/:id`
**Description:** Check the correct code for a question against its test cases.

**Response:**
- Success:  
  ```json
  {
    "passed": 2,
    "total": 3,
    "results": [
      { "passed": true, ... },
      { "passed": false, ... }
    ]
  }
  ```
- Error:  
  ```json
  {
    "error": "Compiler service error",
    "details": { ... }
  }
  ```

---

### GET `/question/getQuestion`
**Description:** Get all questions for the authenticated user's year.

**Response:**
- Success:  
  ```json
  [
    {
      "_id": "questionId1",
      "title": "Question Title",
      "description": "Question Description"
    }
  ]
  ```
- Error:  
  ```json
  {
    "error": "User ID not found in request. Make sure you are authenticated."
  }
  ```

---

### GET `/question/question/:id`
**Description:** Get a question by ID (only if it matches user's year).

**Response:**
- Success:  
  ```json
  {
    "question": {
      "_id": "questionId",
      "year": 1,
      "number": 1,
      "title": "Question Title", 
      "description": "Question Description",
      "test_cases": [...]
    }
  }
  ```
- Error:  
  ```json
  {
    "error": "Access denied. Question is not for your year."
  }
  ```

---

## Submission Routes

### POST `/submission/submit`
**Description:** Submit code for a question.

**Request Body:**
```json
{
  "code": "print('Hello')",
  "questionid": "questionId"
}
```

**Response:**
- Success:  
  ```json
  {
    "submissionid": "submissionId",
    "passedCount": 2,
    "newScore": 20,
    "results": [
      { "passed": true, ... },
      { "passed": false, ... }
    ]
  }
  ```
- Error:  
  ```json
  {
    "error": "Missing required fields."
  }
  ```

---

## WebSocket Support

The server includes WebSocket support for real-time team score updates. Connect to:
```
ws://localhost:{PORT}
```

**Message Format:**
```json
{
  "type": "scores",
  "teams": [
    {
      "team_name": "Team Name",
      "score": 100
    }
  ]
}
```

---

## Authentication Notes

- Team authentication uses OTP sent via email
- Admin authentication uses username/password with JWT stored in `codenvibe_admin_token` cookie
- Protected routes require appropriate authentication
- Admin routes require `codenvibe_admin_token` cookie
- Question and submission routes require team authentication
- Team and question management is year-based