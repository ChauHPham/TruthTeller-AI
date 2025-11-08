/**
 * Hugging Face Repository Service
 * Saves and retrieves questions from a Hugging Face dataset/repo
 */

/**
 * Save questions to Hugging Face repository
 * @param {Array} questions - Array of question objects to save
 * @param {string} repoId - Hugging Face repo ID (e.g., "username/questions-dataset")
 * @param {string} apiToken - Hugging Face API token with write access
 */
const saveQuestionsToRepo = async (questions, repoId, apiToken) => {
  if (!apiToken || !repoId) {
    console.warn('⚠️ Missing API token or repo ID. Skipping save to Hugging Face.');
    console.warn(`   Token: ${apiToken ? '✅ Present' : '❌ Missing'}`);
    console.warn(`   Repo ID: ${repoId || '❌ Missing'}`);
    return;
  }

  console.log(`💾 Starting save process for ${questions.length} questions to ${repoId}...`);

  try {
    // First, try to get existing questions from the repo
    let existingQuestions = [];
    try {
      console.log(`📥 Checking for existing questions in repo...`);
      const response = await fetch(
        `https://huggingface.co/datasets/${repoId}/resolve/main/questions.json`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`
          }
        }
      );
      
      if (response.ok) {
        existingQuestions = await response.json();
        if (!Array.isArray(existingQuestions)) {
          console.warn('⚠️ Existing questions file is not an array, starting fresh.');
          existingQuestions = [];
        } else {
          console.log(`📦 Found ${existingQuestions.length} existing questions in repo`);
        }
      } else if (response.status === 404) {
        console.log('📝 No existing questions file found, starting fresh.');
      } else {
        console.warn(`⚠️ Could not load existing questions (status ${response.status}), starting fresh.`);
      }
    } catch (error) {
      console.log('📝 No existing questions file found (or error loading), starting fresh.');
      console.log('   Error:', error.message);
      existingQuestions = [];
    }

    // Merge new questions with existing ones (avoid duplicates by question text)
    const existingQuestionTexts = new Set(existingQuestions.map(q => q.question?.toLowerCase().trim()));
    const newQuestions = questions.filter(q => {
      const questionText = q.question?.toLowerCase().trim();
      return questionText && !existingQuestionTexts.has(questionText);
    });
    
    console.log(`🆕 Found ${newQuestions.length} new questions (${questions.length - newQuestions.length} duplicates skipped)`);
    
    if (newQuestions.length === 0) {
      console.log('✅ All questions already exist in repo, skipping save.');
      return;
    }
    
    const allQuestions = [...existingQuestions, ...newQuestions];
    console.log(`📊 Total questions after merge: ${allQuestions.length}`);
    
    // Save to Hugging Face using the commits API (correct method for datasets)
    await saveQuestionsViaCommit(newQuestions, repoId, apiToken, allQuestions);
  } catch (error) {
    console.error('❌ Error saving questions to Hugging Face:', error);
    console.error('   This is a background operation, so the app will continue.');
    // Re-throw so caller can log it, but caller should catch it
    throw error;
  }
};

/**
 * Save questions using Hugging Face commits API
 * Uses the Hub API which requires write access token
 */
const saveQuestionsViaCommit = async (newQuestions, repoId, apiToken, allQuestions) => {
  try {
    console.log(`📤 Preparing to commit ${newQuestions.length} new questions to ${repoId}...`);
    
    const content = JSON.stringify(allQuestions, null, 2);
    console.log(`📝 Content size: ${content.length} characters`);
    
    // Encode content to base64
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    
    // Use Hugging Face Hub API to commit file
    // API endpoint: POST /api/datasets/{repo_id}/commit/{revision}
    const apiUrl = `https://huggingface.co/api/datasets/${repoId}/commit/main`;
    console.log(`🌐 Calling Hugging Face Hub API: ${apiUrl}`);
    
    const commitResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operations: [
          {
            operation: 'addOrUpdate',
            path: 'questions.json',
            content: base64Content
          }
        ],
        commit_message: `Add ${newQuestions.length} new quiz questions - ${new Date().toISOString()}`
      })
    });

    console.log(`📡 Response status: ${commitResponse.status} ${commitResponse.statusText}`);

    if (commitResponse.ok) {
      const responseData = await commitResponse.json().catch(() => ({}));
      console.log(`✅ Successfully saved ${newQuestions.length} new questions to Hugging Face repo: ${repoId}`);
      console.log(`📊 Total questions in repo: ${allQuestions.length}`);
      console.log(`🔗 View repo: https://huggingface.co/datasets/${repoId}`);
      return responseData;
    } else {
      const errorText = await commitResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('❌ Failed to save to Hugging Face repo');
      console.error('Status:', commitResponse.status, commitResponse.statusText);
      console.error('Error response:', errorData);
      
      if (commitResponse.status === 401) {
        console.error('🔑 Authentication failed. Check your API token has write access.');
      } else if (commitResponse.status === 403) {
        console.error('🚫 Permission denied. Make sure your token has "Write" access to the repo.');
      } else if (commitResponse.status === 404) {
        console.error('🔍 Repo not found. Make sure the repo exists and the path is correct.');
        console.error(`   Expected format: "username/repo-name"`);
        console.error(`   Your repo ID: "${repoId}"`);
      } else {
        console.error('❓ Unknown error. Check Hugging Face API status.');
      }
      
      throw new Error(`Hugging Face API error: ${commitResponse.status} - ${errorData.message || errorText}`);
    }
  } catch (error) {
    console.error('❌ Error committing to Hugging Face:', error);
    if (error.message.includes('CORS')) {
      console.error('⚠️ CORS error detected. The Hugging Face Hub API may need to be called from a backend.');
      console.error('💡 Consider using a backend proxy or Vite proxy for Hub API calls.');
    }
    throw error; // Re-throw so caller can handle it
  }
};

/**
 * Load questions from Hugging Face repository
 * @param {string} repoId - Hugging Face repo ID
 * @param {string} apiToken - Hugging Face API token
 * @returns {Array} Array of questions
 */
const loadQuestionsFromRepo = async (repoId, apiToken) => {
  if (!apiToken || !repoId) {
    return [];
  }

  try {
    const response = await fetch(
      `https://huggingface.co/datasets/${repoId}/resolve/main/questions.json`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      }
    );

    if (response.ok) {
      const questions = await response.json();
      console.log(`✅ Loaded ${questions.length} questions from Hugging Face repo`);
      return Array.isArray(questions) ? questions : [];
    } else if (response.status === 404) {
      console.log('Questions file not found in repo yet (will be created on first save)');
    }
  } catch (error) {
    console.log('Could not load questions from repo (may not exist yet):', error.message);
  }

  return [];
};

/**
 * Filter questions from repo by category and difficulty
 * @param {Array} questions - All questions from repo
 * @param {string} category - Category to filter by
 * @param {string} difficulty - Difficulty to filter by
 * @param {number} count - Number of questions to return
 */
const filterQuestionsFromRepo = (questions, category, difficulty, count) => {
  let filtered = questions;
  
  if (category) {
    filtered = filtered.filter(q => q.category === category);
  }
  
  if (difficulty) {
    filtered = filtered.filter(q => q.difficulty === difficulty);
  }
  
  // Shuffle and return requested count
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export { saveQuestionsToRepo, loadQuestionsFromRepo, filterQuestionsFromRepo };

