# Emotion Detector App

A Flask-based web application that lets users chat with an AI-powered emotional companion. The app uses an external LLM (Large Language Model) via a webhook (e.g., n8n) to analyze and respond to user messages.

---

## Features

- User registration and login
- Secure password hashing
- Chat interface with message history
- Sends user messages to an external LLM via webhook for emotion detection and response
- Handles empty or error responses gracefully
- Clear chat history
- Responsive UI (Bootstrap)

---

## Tech Stack

- Python 3.x
- Flask
- Flask-SQLAlchemy
- SQLite (default, can use PostgreSQL)
- n8n or any webhook-compatible LLM backend
- Bootstrap (frontend)

---

## Setup Instructions

1. **Clone the repository**
    ```bash
    git clone <your-repo-url>
    cd Emotion-Detector-app
    ```

2. **Create and activate a virtual environment**
    ```bash
    python -m venv venv
    venv\Scripts\activate  # On Windows
    ```

3. **Install dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4. **Set up environment variables (optional)**
    - You can set `SESSION_SECRET` for Flask session security.

5. **Configure your LLM webhook**
    - By default, the app sends messages to:
      ```
      https://sumit00777.app.n8n.cloud/webhook/emotiondetectionapp
      ```
    - Change this URL in `routes.py` if you use a different endpoint.
    - Your webhook should return a JSON response with a field like `response`, `message`, or `text`.

6. **Run the app**
    ```bash
    python app.py
    ```
    - The app will be available at [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## Customizing for Your LLM

- The app expects the webhook to return a JSON response. Example:
    ```json
    {
      "response": "I'm here for you. How are you feeling today?"
    }
    ```
- If you use n8n, make sure your workflow ends with a "Respond to Webhook" node that outputs such JSON.

---

## Folder Structure

```
Emotion-Detector-app/
│
├── app.py
├── extensions.py
├── models.py
├── routes.py
├── requirements.txt
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── chat.html
│   ├── login.html
│   └── register.html
└── static/
    └── css/
        └── style.css
```

---

## Troubleshooting

- **Empty or error responses:**  
  If you see "Sorry, the AI service did not return any response...", check your webhook endpoint and ensure it returns a valid JSON response.
- **Database errors:**  
  Make sure your database URI is correct and the database file is writable.
- **n8n test mode:**  
  If using n8n, activate your workflow by clicking "Execute Workflow" before sending messages.

---

## License

MIT License

---

## Credits

- Built with [Flask](https://flask.palletsprojects.com/)
- Uses [n8n](https://n8n.io/) for webhook/LLM integration (or any compatible backend)