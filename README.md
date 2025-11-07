# HalluciQuiz - AI-Powered Quiz Application

A modern, interactive quiz application with AI-generated questions using OpenAI.

## Features

- 🤖 **AI-Generated Questions**: Dynamic fact-based questions generated using OpenAI
- 📚 **Multiple Categories**: Science, History, Geography, Technology
- 🎯 **Difficulty Levels**: Easy, Medium, Hard
- 📊 **Question Counts**: Choose 5, 10, or 20 questions
- ✅ **Question Types**: Multiple Choice and True/False
- ⏱️ **Timer System**: Time limits based on difficulty
- 🎨 **Beautiful UI**: Modern design with smooth animations

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure OpenAI API Key

Create a `.env` file in the root directory:
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

Get your API key from: https://platform.openai.com/api-keys

**Note**: If no API key is provided, the app will use fallback questions.

### 3. Run the Development Server
```bash
npm run dev
```

Open `http://localhost:5173/` in your browser.

## How It Works

1. **Select Settings**: Choose category, difficulty, and question count
2. **Start Quiz**: Click "Start Quiz" - AI generates questions on the fly
3. **Answer Questions**: Answer within the time limit
4. **See Results**: Get your score and explanations

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Framer Motion
- OpenAI API (GPT-3.5-turbo)

## Build for Production

```bash
npm run build
npm run preview
```
