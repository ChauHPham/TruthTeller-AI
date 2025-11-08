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

    // Format prompt for instruction-following models (Llama/Mistral format)
    const prompt = `You are a quiz question generator. Generate exactly ${count} ${difficultyDesc} fact-based quiz questions about ${categoryDesc}.

Requirements:
- Questions must be factual and educational (NOT math problems)
- Mix of multiple-choice (4 options) and true/false questions
- Each question must have a clear correct answer
- Include brief explanations for each answer
- Vary the topics within the category

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
    
    console.log('Calling Hugging Face API...');
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

    console.log('Hugging Face API response status:', response.status);

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

