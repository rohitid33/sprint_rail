import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const fetchCards = async () => {
  // For review: fetch only cards due for review
  const res = await axios.get(`${API_BASE_URL}/review-cards`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

export const submitRawData = async (data) => {
  const res = await axios.post(`${API_BASE_URL}/submit-raw`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

// Fetch all subjects for the current user
export const fetchSubjects = async () => {
  const res = await axios.get(`${API_BASE_URL}/subjects`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

// Add a new subject (by submitting a dummy card with just the subject field)
export const addSubject = async (subject) => {
  // The backend does not have a dedicated subject endpoint, so we create a dummy card
  const res = await axios.post(`${API_BASE_URL}/submit-raw`, {
    subject,
    rawText: 'Placeholder fact for subject creation.'
  }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

// Add a new module
export const addModule = async (subject, module) => {
  const res = await axios.post(`${API_BASE_URL}/submit-raw`, {
    subject,
    module,
    rawText: 'Placeholder fact for module creation.'
  }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

// Add a new chapter
export const addChapter = async (subject, module, chapter) => {
  const res = await axios.post(`${API_BASE_URL}/submit-raw`, {
    subject,
    module,
    chapter,
    rawText: 'Placeholder fact for chapter creation.'
  }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

// Add a new section
export const addSection = async (subject, module, chapter, section) => {
  const res = await axios.post(`${API_BASE_URL}/submit-raw`, {
    subject,
    module,
    chapter,
    section,
    rawText: 'Placeholder fact for section creation.'
  }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

// Add a new topic
export const addTopic = async (subject, module, chapter, section, topic) => {
  const res = await axios.post(`${API_BASE_URL}/submit-raw`, {
    subject,
    module,
    chapter,
    section,
    topic,
    rawText: 'Placeholder fact for topic creation.'
  }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};
export const fetchModules = async (subject) => {
  const res = await axios.get(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

export const fetchChapters = async (subject, module) => {
  const res = await axios.get(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

export const fetchSections = async (subject, module, chapter) => {
  const res = await axios.get(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters/${encodeURIComponent(chapter)}/sections`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

export const fetchTopics = async (subject, module, chapter, section) => {
  const res = await axios.get(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters/${encodeURIComponent(chapter)}/sections/${encodeURIComponent(section)}/topics`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

export const fetchCardsForTopic = async (subject, module, chapter, section, topic) => {
  const res = await axios.get(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters/${encodeURIComponent(chapter)}/sections/${encodeURIComponent(section)}/topics/${encodeURIComponent(topic)}/facts`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

export const fetchTopicPerformance = async (subject, module, chapter, section, topic) => {
  const res = await axios.get(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters/${encodeURIComponent(chapter)}/sections/${encodeURIComponent(section)}/topics/${encodeURIComponent(topic)}/performance`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

// --- Delete APIs for cascading deletion ---
// NOTE: You must implement corresponding backend endpoints for full cascading delete support.
export const deleteSubject = async (subject) => {
  // Placeholder: Backend must support deleting a subject and all nested data
  return axios.delete(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
};
export const deleteModule = async (subject, module) => {
  return axios.delete(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
};
export const deleteChapter = async (subject, module, chapter) => {
  return axios.delete(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters/${encodeURIComponent(chapter)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
};
export const deleteSection = async (subject, module, chapter, section) => {
  return axios.delete(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters/${encodeURIComponent(chapter)}/sections/${encodeURIComponent(section)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
};
export const deleteTopic = async (subject, module, chapter, section, topic) => {
  return axios.delete(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters/${encodeURIComponent(chapter)}/sections/${encodeURIComponent(section)}/topics/${encodeURIComponent(topic)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
};
export const deleteCard = async (cardId) => {
  return axios.delete(`${API_BASE_URL}/cards/${cardId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
};

export const addCardToTopic = async (subject, module, chapter, section, topic, content) => {
  const res = await axios.post(`${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters/${encodeURIComponent(chapter)}/sections/${encodeURIComponent(section)}/topics/${encodeURIComponent(topic)}/cards`, { content }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

export const reviewCard = async (cardId, remembered) => {
  const res = await axios.patch(`${API_BASE_URL}/cards/${cardId}/review`, { remembered }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

export const updateCardKeywords = async (cardId, keywords) => {
  const res = await axios.patch(`${API_BASE_URL}/cards/${cardId}/keywords`, { keywords }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

// Update card content
export const updateCardContent = async (cardId, content) => {
  const res = await axios.patch(`${API_BASE_URL}/cards/${cardId}/content`, { content }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

// Function to reorder cards within a topic
export const reorderCards = async (subject, module, chapter, section, topic, cardIds) => {
  const res = await axios.patch(
    `${API_BASE_URL}/subjects/${encodeURIComponent(subject)}/modules/${encodeURIComponent(module)}/chapters/${encodeURIComponent(chapter)}/sections/${encodeURIComponent(section)}/topics/${encodeURIComponent(topic)}/reorder`,
    { cardIds },
    { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }
  );
  return res.data;
};

// --- Forgotten Blanks API ---
// Get forgotten blanks for a card (per user)
export const fetchForgottenBlanks = async (cardId) => {
  const res = await axios.get(`${API_BASE_URL}/cards/${cardId}/blanks`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data; // { forgottenBlanks: [int, ...] }
};

// Update forgotten blanks for a card (per user)
export const updateForgottenBlanks = async (cardId, forgottenBlanks) => {
  const res = await axios.patch(`${API_BASE_URL}/cards/${cardId}/blanks`, { forgottenBlanks }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  return res.data;
};

