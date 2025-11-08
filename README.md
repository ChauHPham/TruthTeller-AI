# TruthtellerAI - AI-Powered Quiz Application

A modern, interactive quiz application with AI-generated questions using Hugging Face (FREE!).

## Features

- 🤖 **AI-Generated Questions**: Dynamic fact-based questions generated using Hugging Face (FREE!)
- 💾 **Auto-Save to Dataset**: Questions automatically saved to your Hugging Face dataset for reuse
- 📚 **Multiple Categories**: Science, History, Geography, Technology
- 🎯 **Difficulty Levels**: Easy, Medium, Hard
- 📊 **Question Counts**: Choose 5, 10, or 20 questions
- ✅ **Question Types**: Multiple Choice and True/False
- ⏱️ **Timer System**: Time limits based on difficulty
- 🎨 **Beautiful UI**: Modern design with smooth animations
- 🔄 **Smart Caching**: Reuses questions from your dataset when available

## Prerequisites

- **Node.js**: Version 16.0 or higher (recommended: 18.x or 20.x)
- **npm**: Version 7.0 or higher (comes with Node.js)

Check your versions:
```bash
node --version
npm --version
```

## Setup

### 1. Clone or Download the Project
```bash
cd TruthtellerAI-Boilerplate
```

### 2. Install Dependencies
```bash
npm install
```

**Important**: If you get errors, try:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### 3. Configure Hugging Face API Token (Optional but Recommended - FREE!)

Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Then edit `.env` and add your Hugging Face API token and optional repo ID:
```env
VITE_HUGGINGFACE_API_TOKEN=your_huggingface_token_here
VITE_HUGGINGFACE_REPO_ID=your_username/your-repo-name
```

**Get your FREE API token**: https://huggingface.co/settings/tokens
- Make sure to select **"Write"** access if you want to save questions to a repo

**Set up a Dataset Repo (Optional but Recommended)**:
1. Create a new dataset at: https://huggingface.co/new-dataset
2. Choose a name (e.g., `truthteller-questions`)
3. Set visibility (Private or Public)
4. Copy the repo ID (format: `username/repo-name`)
5. Add it to your `.env` file as `VITE_HUGGINGFACE_REPO_ID`

**Note**: 
- Hugging Face offers a **FREE tier** with generous limits!
- If no API token is provided, the app will use fallback questions (limited to 5 questions)
- With API token: You get AI-generated questions (5, 10, or 20 questions as selected)
- The app uses Mistral-7B-Instruct, a high-quality open-source model
- **With repo configured**: Generated questions are automatically saved to your Hugging Face dataset for reuse and sharing!

### 4. Run the Development Server
```bash
npm run dev
```

The server will start and show you the local URL (usually `http://localhost:5173/`)

### 5. Troubleshooting

**If Vite doesn't work on other machines:**

1. **Check Node.js version**: Ensure Node.js 16+ is installed
   ```bash
   node --version
   ```

2. **Clear and reinstall dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for port conflicts**: If port 5173 is busy, Vite will use the next available port

4. **Windows users**: Make sure you're using Git Bash or WSL, not Command Prompt (for better compatibility)

5. **Permission issues (Linux/Mac)**:
   ```bash
   sudo npm install
   ```

## How It Works

1. **Select Settings**: Choose category, difficulty, and question count
2. **Start Quiz**: Click "Start Quiz" 
   - First checks your Hugging Face dataset for existing questions
   - If not enough found, generates new questions using AI
   - New questions are automatically saved to your dataset
3. **Answer Questions**: Answer within the time limit
4. **See Results**: Get your score and explanations

### Dataset Feature

When you configure a Hugging Face repo:
- ✅ **Auto-Save**: All generated questions are saved to your dataset
- ✅ **Reuse**: Questions are loaded from your dataset when available (faster!)
- ✅ **Share**: Make your dataset public to share with others
- ✅ **Train**: Use your dataset to train custom models later
- ✅ **No Duplicates**: Automatically avoids saving duplicate questions

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Hugging Face Inference API (Mistral-7B-Instruct) - **FREE!**

## Build for Production

```bash
npm run build
npm run preview
```

## Future Features (Planned)

- 🔍 **Note Validation**: AI will validate user-submitted notes against a database and ask users to double-check if information doesn't match
- 📊 **Progress Tracking**: Save quiz results and track improvement over time
- 🏆 **Achievements**: Unlock badges and achievements
- 📝 **Custom Questions**: Users can submit their own questions

## Known Issues & Fixes

### Issue: Only 1 question shows up
**Fix Applied**: 
- Increased `max_tokens` based on question count
- Added validation to ensure all generated questions are used
- Added debugging logs to track question generation

### Issue: Vite doesn't work on other machines
**Fix Applied**:
- Added Node.js version requirements
- Added troubleshooting section
- Created `.gitignore` to prevent committing node_modules
- Added instructions for clearing cache and reinstalling

## Support

If you encounter issues:
1. Check the browser console (F12) for error messages
2. Verify your Node.js version is 16+
3. Try clearing node_modules and reinstalling
4. Check that your `.env` file is in the root directory (if using API key)
