/**
 * AI Question Generation Service
 * Generates fact-based quiz questions using AI
 * Also saves questions to Hugging Face dataset/repo for reuse
 */

import { saveQuestionsToRepo, loadQuestionsFromRepo, filterQuestionsFromRepo } from './huggingFaceRepoService';

const generateQuestionsWithAI = async (category, difficulty, count) => {
  // Get Hugging Face API token and repo ID from environment variables
  const API_TOKEN = import.meta.env.VITE_HUGGINGFACE_API_TOKEN || '';
  const REPO_ID = import.meta.env.VITE_HUGGINGFACE_REPO_ID || '';
  
  // Try to load questions from repo first (if repo is configured)
  if (REPO_ID && API_TOKEN) {
    try {
      const repoQuestions = await loadQuestionsFromRepo(REPO_ID, API_TOKEN);
      if (repoQuestions.length > 0) {
        const filtered = filterQuestionsFromRepo(repoQuestions, category, difficulty, count);
        if (filtered.length >= count) {
          console.log(`✅ Using ${filtered.length} questions from Hugging Face repo`);
          return filtered;
        }
      }
    } catch (error) {
      console.log('Could not load from repo, generating new questions:', error.message);
    }
  }
  
  if (!API_TOKEN) {
    console.warn('No Hugging Face API token found. Using fallback questions.');
    return generateFallbackQuestions(category, difficulty, count);
  }

  try {
    const categoryDescription = {
      science: "science, biology, chemistry, physics, astronomy, and natural sciences",
      history: "world history, historical events, famous people, and historical facts",
      geography: "geography, countries, capitals, landmarks, natural features, and world geography",
      technology: "technology, computers, programming, internet, software, and tech innovations"
    };

    const difficultyDescription = {
      easy: "easy and straightforward",
      medium: "moderately challenging",
      hard: "difficult and advanced"
    };

    const categoryDesc = category 
      ? categoryDescription[category] 
      : "general knowledge across science, history, geography, and technology";
    
    const difficultyDesc = difficultyDescription[difficulty] || "moderately challenging";

    // Format prompt for Mistral instruction-following model
    const prompt = `<s>[INST] You are a quiz question generator. Generate ${count} UNIQUE and DIFFERENT ${difficultyDesc} fact-based quiz questions about ${categoryDesc}.

IMPORTANT: Generate completely NEW and UNIQUE questions each time. Do NOT repeat questions you've generated before.

Requirements:
- Questions should be factual and educational (NOT math problems)
- Mix of multiple-choice (4 options) and true/false questions
- Each question should have a clear correct answer
- Include brief explanations for each answer
- Vary the topics and subjects within the category
- Format as JSON array with this EXACT structure:
[
  {
    "type": "multiple-choice" or "true-false",
    "question": "question text",
    "options": ["option1", "option2", "option3", "option4"] (only for multiple-choice),
    "correct": 0 (index for multiple-choice) or true/false (for true-false),
    "explanation": "brief explanation"
  }
]

Return ONLY valid JSON array, no additional text or markdown. [/INST]`;

    // Use Hugging Face Inference API with a free open-source model
    // Using mistralai/Mistral-7B-Instruct-v0.2 for good quality and free tier support
    const model = "mistralai/Mistral-7B-Instruct-v0.2";
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature: 0.9,
            max_new_tokens: count * 150,
            return_full_text: false
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Hugging Face API error: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    // Hugging Face returns an array with generated text
    let content = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
      content = data[0].generated_text.trim();
    } else if (data.generated_text) {
      content = data.generated_text.trim();
    } else {
      throw new Error('Unexpected response format from Hugging Face API');
    }
    
    // Extract JSON from response (handle cases where AI adds markdown formatting)
    let jsonContent = content;
    if (content.startsWith('```json')) {
      jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.startsWith('```')) {
      jsonContent = content.replace(/```\n?/g, '');
    }
    
    const questions = JSON.parse(jsonContent);
    
    // Validate that we got an array
    if (!Array.isArray(questions)) {
      throw new Error('AI did not return an array of questions');
    }
    
    // Ensure we have exactly the requested number of questions
    // If AI generated fewer, we'll use what we have (but log a warning)
    // If AI generated more, we'll take only the requested count
    const limitedQuestions = questions.slice(0, count);
    
    if (limitedQuestions.length < count) {
      console.warn(`AI only generated ${limitedQuestions.length} questions, requested ${count}`);
    }
    
    // Add IDs and ensure proper formatting
    const formattedQuestions = limitedQuestions.map((q, index) => ({
      id: Date.now() + index,
      category: category || 'mixed',
      difficulty: difficulty,
      type: q.type || 'multiple-choice',
      question: q.question,
      options: q.options || [],
      correct: q.correct,
      explanation: q.explanation || 'No explanation provided.'
    }));
    
    // If we got fewer questions than requested, try to generate more
    if (formattedQuestions.length < count && formattedQuestions.length > 0) {
      console.log(`Got ${formattedQuestions.length} questions, need ${count}. This is normal if AI response was truncated.`);
    }
    
    // Save questions to Hugging Face repo (background operation, don't wait)
    if (REPO_ID && API_TOKEN && formattedQuestions.length > 0) {
      saveQuestionsToRepo(formattedQuestions, REPO_ID, API_TOKEN).catch(err => {
        console.warn('Background save to repo failed (non-critical):', err);
      });
    }
    
    return formattedQuestions;

  } catch (error) {
    console.error('Error generating AI questions with Hugging Face:', error);
    // Fallback to static questions
    return generateFallbackQuestions(category, difficulty, count);
  }
};

// Fallback questions if AI fails or no API key
const generateFallbackQuestions = (category, difficulty, count) => {
  const fallbackQuestions = [
    {
      id: 1,
      category: "science",
      difficulty: "easy",
      type: "multiple-choice",
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correct: 1,
      explanation: "Mars is called the Red Planet due to iron oxide on its surface."
    },
    {
      id: 2,
      category: "science",
      difficulty: "medium",
      type: "true-false",
      question: "The human body has 206 bones.",
      correct: true,
      explanation: "Yes, the adult human body has 206 bones."
    },
    {
      id: 3,
      category: "history",
      difficulty: "easy",
      type: "multiple-choice",
      question: "In which year did World War II end?",
      options: ["1944", "1945", "1946", "1947"],
      correct: 1,
      explanation: "World War II ended in 1945."
    },
    {
      id: 4,
      category: "geography",
      difficulty: "easy",
      type: "multiple-choice",
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correct: 2,
      explanation: "Paris is the capital of France."
    },
    {
      id: 5,
      category: "technology",
      difficulty: "easy",
      type: "true-false",
      question: "HTML stands for HyperText Markup Language.",
      correct: true,
      explanation: "Yes, HTML stands for HyperText Markup Language."
    }
  ];

  // Filter and return requested count
  let filtered = fallbackQuestions;
  if (category) {
    filtered = filtered.filter(q => q.category === category);
  }
  if (difficulty) {
    filtered = filtered.filter(q => q.difficulty === difficulty);
  }
  
  return filtered.slice(0, count);
};

export { generateQuestionsWithAI };

