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
    console.warn('Missing API token or repo ID. Skipping save to Hugging Face.');
    return;
  }

  try {
    // First, try to get existing questions from the repo
    let existingQuestions = [];
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
        existingQuestions = await response.json();
        if (!Array.isArray(existingQuestions)) {
          existingQuestions = [];
        }
      }
    } catch (error) {
      console.log('No existing questions file found, starting fresh.');
      existingQuestions = [];
    }

    // Merge new questions with existing ones (avoid duplicates by question text)
    const existingQuestionTexts = new Set(existingQuestions.map(q => q.question?.toLowerCase()));
    const newQuestions = questions.filter(q => !existingQuestionTexts.has(q.question?.toLowerCase()));
    
    if (newQuestions.length === 0) {
      console.log('All questions already exist in repo, skipping save.');
      return;
    }
    
    const allQuestions = [...existingQuestions, ...newQuestions];
    
    // Save to Hugging Face using the commits API (correct method for datasets)
    await saveQuestionsViaCommit(newQuestions, repoId, apiToken, allQuestions);
  } catch (error) {
    console.error('Error saving questions to Hugging Face:', error);
    // Don't throw - this is a background operation
  }
};

/**
 * Save questions using Hugging Face commits API
 */
const saveQuestionsViaCommit = async (newQuestions, repoId, apiToken, allQuestions) => {
  try {
    const content = JSON.stringify(allQuestions, null, 2);
    
    // Encode content to base64
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    
    // Use Hugging Face Hub API to commit file
    const commitResponse = await fetch(
      `https://huggingface.co/api/datasets/${repoId}/commit/main`,
      {
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
      }
    );

    if (commitResponse.ok) {
      console.log(`✅ Saved ${newQuestions.length} new questions to Hugging Face repo: ${repoId}`);
      console.log(`📊 Total questions in repo: ${allQuestions.length}`);
    } else {
      const errorData = await commitResponse.json().catch(() => ({}));
      console.warn('Could not save to Hugging Face repo:', errorData);
      console.warn('Make sure your token has write access and the repo exists.');
    }
  } catch (error) {
    console.error('Error committing to Hugging Face:', error);
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

