/**
 * AI Question Generation Service
 * Generates fact-based quiz questions using AI
 */

const generateQuestionsWithAI = async (category, difficulty, count) => {
  // Get API key from environment variable or use a default
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
  
  if (!API_KEY) {
    console.warn('No API key found. Using fallback questions.');
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

    const prompt = `Generate ${count} UNIQUE and DIFFERENT ${difficultyDesc} fact-based quiz questions about ${categoryDesc}. 
    
IMPORTANT: Generate completely NEW and UNIQUE questions each time. Do NOT repeat questions you've generated before.

Requirements:
- Questions should be factual and educational (NOT math problems)
- Mix of multiple-choice (4 options) and true/false questions
- Each question should have a clear correct answer
- Include brief explanations for each answer
- Vary the topics and subjects within the category
- Format as JSON array with this structure:
[
  {
    "type": "multiple-choice" or "true-false",
    "question": "question text",
    "options": ["option1", "option2", "option3", "option4"] (only for multiple-choice),
    "correct": 0 (index for multiple-choice) or true/false (for true-false),
    "explanation": "brief explanation"
  }
]

Return ONLY valid JSON, no additional text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a quiz question generator. Always return valid JSON arrays with quiz questions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // Higher temperature for more variety and uniqueness
        max_tokens: count * 150 // Increase tokens based on question count (150 per question)
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
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
    
    return formattedQuestions;

  } catch (error) {
    console.error('Error generating AI questions:', error);
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

