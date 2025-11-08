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
  
  // Try to load questions from repo first (if repo is configured) - but don't block if it fails
  // Skip repo loading if it's taking too long or failing - prioritize API generation
  if (REPO_ID && API_TOKEN) {
    try {
      console.log('📦 Checking repo for existing questions...');
      const repoQuestions = await Promise.race([
        loadQuestionsFromRepo(REPO_ID, API_TOKEN),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Repo load timeout')), 2000))
      ]);
      if (repoQuestions && repoQuestions.length > 0) {
        const filtered = filterQuestionsFromRepo(repoQuestions, category, difficulty, count);
        if (filtered.length >= count) {
          console.log(`✅ Using ${filtered.length} questions from Hugging Face repo`);
          return filtered;
        } else {
          console.log(`📦 Found ${filtered.length} questions in repo, need ${count}. Generating more via API...`);
        }
      } else {
        console.log('📦 No questions found in repo, generating new ones via API...');
      }
    } catch (error) {
      console.log('📦 Could not load from repo (non-critical, continuing with API):', error.message);
      // Continue to generate new questions - don't let repo errors block API calls
    }
  }
  
  if (!API_TOKEN) {
    console.warn('⚠️ No Hugging Face API token found. Using fallback questions.');
    console.warn('💡 Add VITE_HUGGINGFACE_API_TOKEN to your .env file');
    return generateFallbackQuestions(category, difficulty, count);
  }

  console.log('✅ API token found, generating questions with Hugging Face...');

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

    // Add randomness to ensure different questions each time
    const randomSeed = Date.now() + Math.random() * 1000;
    const uniqueTopics = [
      "specific historical events", "scientific discoveries", "geographical features", 
      "technological innovations", "famous people", "natural phenomena", 
      "cultural facts", "scientific principles", "world landmarks", "tech history"
    ];
    const randomTopic = uniqueTopics[Math.floor(Math.random() * uniqueTopics.length)];
    
    // Format prompt for instruction-following models (Llama/Mistral format)
    const prompt = `You are a quiz question generator. Generate exactly ${count} ${difficultyDesc} fact-based quiz questions about ${categoryDesc}.

IMPORTANT: Generate UNIQUE and DIFFERENT questions. Do NOT repeat common questions. Focus on ${randomTopic} and vary the specific topics.

Requirements:
- Questions must be factual and educational (NOT math problems)
- Mix of multiple-choice (4 options) and true/false questions
- Each question must have a clear correct answer
- Include brief explanations for each answer
- Vary the topics within the category - avoid repeating the same questions
- Make each question unique and interesting
- Use diverse examples and avoid common textbook questions

Return ONLY a valid JSON array with this EXACT structure:
[
  {
    "type": "multiple-choice",
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correct": 2,
    "explanation": "Paris is the capital of France."
  },
  {
    "type": "true-false",
    "question": "The Earth is round.",
    "correct": true,
    "explanation": "Yes, the Earth is approximately spherical."
  }
]

Return ONLY the JSON array, no markdown, no code blocks, no additional text.`;

    // Use Hugging Face Inference API with a free open-source model
    // Try multiple models - some may be faster/more reliable
    // Using meta-llama/Llama-3.2-3B-Instruct for better JSON generation
    const model = "meta-llama/Llama-3.2-3B-Instruct";
    
    // Alternative models to try if this fails:
    // "mistralai/Mistral-7B-Instruct-v0.2"
    // "google/gemma-2b-it"
    
    console.log('Calling Hugging Face API via proxy...');
    console.log('Model:', model);
    console.log('Prompt length:', prompt.length);
    
    // Use Vite proxy to avoid CORS issues
    const proxyUrl = `/api/huggingface/models/${model}`;
    console.log('Proxy URL:', proxyUrl);
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HF-Token': API_TOKEN // Pass token in custom header for proxy
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: 1.2, // Higher temperature for more variety and creativity
          max_new_tokens: count * 200, // Increased to ensure we get all questions
          return_full_text: false,
          top_p: 0.95, // Nucleus sampling for diversity
          do_sample: true // Enable sampling for randomness
        }
      })
    }).catch(fetchError => {
      console.error('Fetch error (network/CORS):', fetchError);
      throw new Error(`Network error: ${fetchError.message}. Make sure dev server is running with proxy enabled.`);
    });

    console.log('Hugging Face API response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Hugging Face API error:', errorData);
      
      // Handle model loading case
      if (errorData.error && errorData.error.includes('loading')) {
        console.warn('Model is loading, this may take 20-30 seconds. Retrying in 5 seconds...');
        // Wait and retry once
        await new Promise(resolve => setTimeout(resolve, 5000));
        return generateQuestionsWithAI(category, difficulty, count); // Retry
      }
      
      throw new Error(`Hugging Face API error: ${response.status} - ${errorData.error || JSON.stringify(errorData) || response.statusText}`);
    }

    const data = await response.json();
    console.log('Hugging Face API response data:', data);
    
    // Hugging Face returns different formats depending on the model
    let content = '';
    if (Array.isArray(data)) {
      // Array format: [{generated_text: "..."}]
      if (data[0]?.generated_text) {
        content = data[0].generated_text.trim();
      } else if (data[0]?.text) {
        content = data[0].text.trim();
      }
    } else if (data.generated_text) {
      // Direct format: {generated_text: "..."}
      content = data.generated_text.trim();
    } else if (data[0]?.generated_text) {
      // Nested array format
      content = data[0].generated_text.trim();
    } else {
      console.error('Unexpected response format:', data);
      throw new Error('Unexpected response format from Hugging Face API. Response: ' + JSON.stringify(data).substring(0, 200));
    }
    
    if (!content) {
      throw new Error('No generated text in response from Hugging Face API');
    }
    
    console.log('Extracted content length:', content.length);
    
    // Extract JSON from response (handle cases where AI adds markdown formatting)
    let jsonContent = content;
    
    // Remove markdown code blocks if present
    if (content.includes('```json')) {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      } else {
        jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
    } else if (content.includes('```')) {
      const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        jsonContent = codeMatch[1].trim();
      } else {
        jsonContent = content.replace(/```\n?/g, '');
      }
    }
    
    // Try to find JSON array in the content if it's not at the start
    if (!jsonContent.trim().startsWith('[')) {
      const jsonArrayMatch = jsonContent.match(/\[[\s\S]*\]/);
      if (jsonArrayMatch) {
        jsonContent = jsonArrayMatch[0];
      }
    }
    
    console.log('Attempting to parse JSON, content preview:', jsonContent.substring(0, 200));
    
    let questions;
    try {
      questions = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content that failed to parse:', jsonContent.substring(0, 500));
      throw new Error(`Failed to parse JSON from AI response: ${parseError.message}`);
    }
    
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
      explanation: q.explanation || 'No explanation provided.',
      source: 'ai-generated', // Mark as AI-generated
      generatedAt: new Date().toISOString()
    }));
    
    console.log(`✅ Successfully generated ${formattedQuestions.length} AI questions`);
    console.log(`📝 Sample question: "${formattedQuestions[0]?.question?.substring(0, 50)}..."`);
    
    // If we got fewer questions than requested, try to generate more
    if (formattedQuestions.length < count && formattedQuestions.length > 0) {
      console.log(`Got ${formattedQuestions.length} questions, need ${count}. This is normal if AI response was truncated.`);
    }
    
    // Save questions to Hugging Face repo (background operation, don't wait)
    // Only save AI-generated questions, not fallback questions
    if (REPO_ID && API_TOKEN && formattedQuestions.length > 0) {
      // Check if these are AI-generated (not fallback)
      const isAIGenerated = formattedQuestions.some(q => q.source === 'ai-generated');
      if (isAIGenerated) {
        console.log(`💾 Attempting to save ${formattedQuestions.length} AI-generated questions to repo: ${REPO_ID}`);
        // Don't await - let it run in background
        saveQuestionsToRepo(formattedQuestions, REPO_ID, API_TOKEN)
          .then(() => {
            console.log('✅ Questions saved to repo successfully');
          })
          .catch(err => {
            console.error('❌ Background save to repo failed (non-critical):', err.message);
            // Don't break the flow - this is a background operation
          });
      } else {
        console.log('💾 Skipping repo save: Questions are fallback (not AI-generated)');
      }
    } else {
      if (!REPO_ID) {
        console.log('💾 Skipping repo save: No REPO_ID configured');
      } else if (!API_TOKEN) {
        console.log('💾 Skipping repo save: No API_TOKEN configured');
      } else if (formattedQuestions.length === 0) {
        console.log('💾 Skipping repo save: No questions to save');
      }
    }
    
    return formattedQuestions;

  } catch (error) {
    console.error('❌ Error generating AI questions with Hugging Face:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    // Show user-friendly error message
    if (error.message.includes('API error')) {
      console.warn('⚠️ API call failed. Check your API token and network connection.');
    } else if (error.message.includes('parse')) {
      console.warn('⚠️ AI response format issue. The model may need better prompting.');
    }
    
    // Fallback to static questions
    console.log('🔄 Falling back to default questions...');
    return generateFallbackQuestions(category, difficulty, count);
  }
};

// Fallback questions if AI fails or no API key
const generateFallbackQuestions = (category, difficulty, count) => {
  console.warn('⚠️ Using FALLBACK questions (AI generation failed or no API token)');
  const fallbackQuestions = [
    // Science - Easy
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
      difficulty: "easy",
      type: "true-false",
      question: "Water boils at 100 degrees Celsius at sea level.",
      correct: true,
      explanation: "Yes, water boils at 100°C (212°F) at standard atmospheric pressure."
    },
    // Science - Medium
    {
      id: 3,
      category: "science",
      difficulty: "medium",
      type: "true-false",
      question: "The human body has 206 bones.",
      correct: true,
      explanation: "Yes, the adult human body has 206 bones."
    },
    {
      id: 4,
      category: "science",
      difficulty: "medium",
      type: "multiple-choice",
      question: "What is the chemical symbol for gold?",
      options: ["Go", "Gd", "Au", "Ag"],
      correct: 2,
      explanation: "Au is the chemical symbol for gold (from Latin 'aurum')."
    },
    // Science - Hard
    {
      id: 5,
      category: "science",
      difficulty: "hard",
      type: "multiple-choice",
      question: "What is the speed of light in a vacuum?",
      options: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "299,792 km/s"],
      correct: 3,
      explanation: "The speed of light in a vacuum is exactly 299,792,458 meters per second (approximately 300,000 km/s)."
    },
    // History - Easy
    {
      id: 6,
      category: "history",
      difficulty: "easy",
      type: "multiple-choice",
      question: "In which year did World War II end?",
      options: ["1944", "1945", "1946", "1947"],
      correct: 1,
      explanation: "World War II ended in 1945."
    },
    {
      id: 7,
      category: "history",
      difficulty: "easy",
      type: "true-false",
      question: "The United States declared independence in 1776.",
      correct: true,
      explanation: "Yes, the Declaration of Independence was signed on July 4, 1776."
    },
    // History - Medium
    {
      id: 8,
      category: "history",
      difficulty: "medium",
      type: "multiple-choice",
      question: "Who was the first person to walk on the moon?",
      options: ["Buzz Aldrin", "Neil Armstrong", "Michael Collins", "John Glenn"],
      correct: 1,
      explanation: "Neil Armstrong was the first person to walk on the moon on July 20, 1969."
    },
    // History - Hard
    {
      id: 9,
      category: "history",
      difficulty: "hard",
      type: "multiple-choice",
      question: "The Renaissance period began in which country?",
      options: ["France", "Germany", "Italy", "Spain"],
      correct: 2,
      explanation: "The Renaissance began in Italy in the 14th century, particularly in Florence."
    },
    // Geography - Easy
    {
      id: 10,
      category: "geography",
      difficulty: "easy",
      type: "multiple-choice",
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correct: 2,
      explanation: "Paris is the capital of France."
    },
    {
      id: 11,
      category: "geography",
      difficulty: "easy",
      type: "true-false",
      question: "Mount Everest is the tallest mountain in the world.",
      correct: true,
      explanation: "Yes, Mount Everest is the highest peak above sea level at 8,848 meters (29,029 feet)."
    },
    // Geography - Medium
    {
      id: 12,
      category: "geography",
      difficulty: "medium",
      type: "multiple-choice",
      question: "Which is the largest ocean on Earth?",
      options: ["Atlantic", "Indian", "Arctic", "Pacific"],
      correct: 3,
      explanation: "The Pacific Ocean is the largest ocean, covering about one-third of Earth's surface."
    },
    // Geography - Hard
    {
      id: 13,
      category: "geography",
      difficulty: "hard",
      type: "multiple-choice",
      question: "What is the deepest point in the ocean?",
      options: ["Mariana Trench", "Puerto Rico Trench", "Java Trench", "Tonga Trench"],
      correct: 0,
      explanation: "The Mariana Trench in the Pacific Ocean is the deepest point, reaching about 11,034 meters (36,201 feet)."
    },
    // Technology - Easy
    {
      id: 14,
      category: "technology",
      difficulty: "easy",
      type: "true-false",
      question: "HTML stands for HyperText Markup Language.",
      correct: true,
      explanation: "Yes, HTML stands for HyperText Markup Language."
    },
    {
      id: 15,
      category: "technology",
      difficulty: "easy",
      type: "multiple-choice",
      question: "What does CPU stand for?",
      options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Computer Processing Unit"],
      correct: 0,
      explanation: "CPU stands for Central Processing Unit, the main processor in a computer."
    },
    // Technology - Medium
    {
      id: 16,
      category: "technology",
      difficulty: "medium",
      type: "multiple-choice",
      question: "Which programming language was created by Guido van Rossum?",
      options: ["Java", "Python", "JavaScript", "C++"],
      correct: 1,
      explanation: "Python was created by Guido van Rossum and first released in 1991."
    },
    // Technology - Hard
    {
      id: 17,
      category: "technology",
      difficulty: "hard",
      type: "multiple-choice",
      question: "What is the time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      correct: 1,
      explanation: "Binary search has O(log n) time complexity because it eliminates half of the search space in each iteration."
    }
  ];

  // Filter by category and difficulty
  let filtered = fallbackQuestions;
  if (category) {
    filtered = filtered.filter(q => q.category === category);
  }
  if (difficulty) {
    filtered = filtered.filter(q => q.difficulty === difficulty);
  }
  
  // If filtering results in too few questions, use all available and repeat if needed
  if (filtered.length < count) {
    console.warn(`⚠️ Only ${filtered.length} fallback questions match your filters. Repeating questions to reach ${count}.`);
    const repeated = [];
    for (let i = 0; i < count; i++) {
      repeated.push({
        ...filtered[i % filtered.length],
        id: filtered[i % filtered.length].id + (i * 1000) // Make IDs unique
      });
    }
    return repeated;
  }
  
  return filtered.slice(0, count);
};

export { generateQuestionsWithAI };

