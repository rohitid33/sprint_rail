require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Models
// Hierarchical Models
const CardSchema = new mongoose.Schema({
  subject: String,
  module: String,
  chapter: String,
  section: String,
  topic: String,
  content: String, // One sentence per card
  keywords: [Number], // Highlighted keyword indices (positions in card content). NOTE: If you have existing data, migrate keywords from [String] to [Number].
  reviewHistory: [
    {
      date: Date,
      remembered: Boolean,
    },
  ],
  nextReview: Date, // For spaced repetition (legacy)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Spaced repetition scheduling (per card or topic)
  reviewSchedule: {
    currentStage: { type: Number, default: 0 }, // 0 = not started, 1 = Day 1, ...
    nextReview: { type: Date },
    log: [
      {
        date: Date,
        stage: Number,
        success: Boolean,
        performance: Number // percent correct, etc.
      }
    ]
  },
  // --- Forgotten blanks analytics ---
  forgottenBlanks: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      blanks: [Number], // indices of forgotten blanks for this user
      stats: { type: Map, of: Number, default: {} } // blankIdx: forget count
    }
  ]
});
const Card = mongoose.model('Card', CardSchema);

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String, // hashed
});
const User = mongoose.model('User', UserSchema);

const extractKeywords = (sentence) => {
  // Simple keyword extraction: pick 1-2 longest words (can swap for NLP lib)
  const words = sentence.split(/\s+/).filter(w => w.length > 4);
  return words.sort((a, b) => b.length - a.length).slice(0, 2);
};

// Auth: Signup
const jwt = require('jsonwebtoken');
// Signup/Login routes are commented out since authentication is not required.
// app.post('/api/auth/signup', async (req, res) => { ... });
// app.post('/api/auth/login', async (req, res) => { ... });

// Generate a default JWT for client use (no authentication required)
app.get('/api/default-token', (req, res) => {
  const token = jwt.sign({ userId: '000000000000000000000000' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  res.json({ token });
});

// Auth: Login
// app.post('/api/auth/login', async (req, res) => { ... });

// No authentication: inject a default userId for all requests
const DEFAULT_USER_ID = '000000000000000000000000'; // 24-char Mongo ObjectId string
const auth = (req, res, next) => {
  req.userId = DEFAULT_USER_ID;
  next();
};

// Get all distinct subjects
app.get('/api/subjects', auth, async (req, res) => {
  try {
    const subjects = await Card.distinct('subject', { createdBy: req.userId });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects', details: err.message });
  }
});

// Get all distinct modules for a subject
app.get('/api/subjects/:subject/modules', auth, async (req, res) => {
  try {
    const modules = await Card.distinct('module', {
      subject: req.params.subject,
      createdBy: req.userId
    });
    res.json(modules.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch modules', details: err.message });
  }
});

// Get all distinct chapters for a subject + module
app.get('/api/subjects/:subject/modules/:module/chapters', auth, async (req, res) => {
  try {
    const chapters = await Card.distinct('chapter', {
      subject: req.params.subject,
      module: req.params.module,
      createdBy: req.userId
    });
    res.json(chapters.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chapters', details: err.message });
  }
});

// Get all distinct sections for a subject + module + chapter
app.get('/api/subjects/:subject/modules/:module/chapters/:chapter/sections', auth, async (req, res) => {
  try {
    const sections = await Card.distinct('section', {
      subject: req.params.subject,
      module: req.params.module,
      chapter: req.params.chapter,
      createdBy: req.userId
    });
    res.json(sections.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sections', details: err.message });
  }
});

// Get all distinct topics for a subject + module + chapter + section
app.get('/api/subjects/:subject/modules/:module/chapters/:chapter/sections/:section/topics', auth, async (req, res) => {
  try {
    const topics = await Card.distinct('topic', {
      subject: req.params.subject,
      module: req.params.module,
      chapter: req.params.chapter,
      section: req.params.section,
      createdBy: req.userId
    });
    res.json(topics.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch topics', details: err.message });
  }
});

// Get all facts for a subject + module + chapter + section + topic
app.get('/api/subjects/:subject/modules/:module/chapters/:chapter/sections/:section/topics/:topic/facts', auth, async (req, res) => {
  try {
    const facts = await Card.find({
      subject: req.params.subject,
      module: req.params.module,
      chapter: req.params.chapter,
      section: req.params.section,
      topic: req.params.topic,
      createdBy: req.userId
    });
    res.json(facts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch facts', details: err.message });
  }
});

// Reorder cards in a topic
app.patch('/api/subjects/:subject/modules/:module/chapters/:chapter/sections/:section/topics/:topic/cards/reorder', auth, async (req, res) => {
  try {
    const { cardIds } = req.body;
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: 'cardIds (non-empty array) required' });
    }
    // Update the order field for each card
    await Promise.all(cardIds.map((id, idx) =>
      Card.findOneAndUpdate({ _id: id, subject: req.params.subject, module: req.params.module, chapter: req.params.chapter, section: req.params.section, topic: req.params.topic, createdBy: req.userId }, { order: idx })
    ));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder cards', details: err.message });
  }
});

// Add a card to a specific topic
app.post('/api/subjects/:subject/modules/:module/chapters/:chapter/sections/:section/topics/:topic/cards', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const keywords = [];
    const now = new Date();
    const card = new Card({
      subject: req.params.subject,
      module: req.params.module,
      chapter: req.params.chapter,
      section: req.params.section,
      topic: req.params.topic,
      content,
      keywords,
      createdBy: req.userId,
      reviewSchedule: {
        currentStage: 1,
        nextReview: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // +1 day
        log: []
      }
    });
    await card.save();
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add card', details: err.message });
  }
});

// Add a subject/module/chapter/section/topic by submitting a dummy card (for hierarchy creation)
app.post('/api/submit-raw', auth, async (req, res) => {
  try {
    const { subject, module, chapter, section, topic, rawText } = req.body;
    if (!subject || !rawText) {
      return res.status(400).json({ error: 'subject and rawText are required' });
    }
    const card = new Card({
      subject,
      module,
      chapter,
      section,
      topic,
      content: rawText,
      keywords: [],
      createdBy: req.userId,
      reviewSchedule: {
        currentStage: 0,
        log: []
      }
    });
    await card.save();
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit raw data', details: err.message });
  }
});

// PATCH: Rename a module
app.patch('/api/subjects/:subject/modules/:oldModule', auth, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: 'newName is required' });
    const result = await Card.updateMany(
      { subject: req.params.subject, module: req.params.oldModule, createdBy: req.userId },
      { $set: { module: newName } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename module', details: err.message });
  }
});

// PATCH: Rename a chapter
app.patch('/api/subjects/:subject/modules/:module/chapters/:oldChapter', auth, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: 'newName is required' });
    const result = await Card.updateMany(
      { subject: req.params.subject, module: req.params.module, chapter: req.params.oldChapter, createdBy: req.userId },
      { $set: { chapter: newName } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename chapter', details: err.message });
  }
});

// PATCH: Rename a section
app.patch('/api/subjects/:subject/modules/:module/chapters/:chapter/sections/:oldSection', auth, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: 'newName is required' });
    const result = await Card.updateMany(
      { subject: req.params.subject, module: req.params.module, chapter: req.params.chapter, section: req.params.oldSection, createdBy: req.userId },
      { $set: { section: newName } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename section', details: err.message });
  }
});

// PATCH: Rename a topic
app.patch('/api/subjects/:subject/modules/:module/chapters/:chapter/sections/:section/topics/:oldTopic', auth, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: 'newName is required' });
    const result = await Card.updateMany(
      { subject: req.params.subject, module: req.params.module, chapter: req.params.chapter, section: req.params.section, topic: req.params.oldTopic, createdBy: req.userId },
      { $set: { topic: newName } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename topic', details: err.message });
  }
});


// --- API: Get forgotten blanks for a card (per user) ---
app.get('/api/cards/:cardId/blanks', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    const entry = card.forgottenBlanks.find(e => e.user.toString() === req.userId);
    res.json({ forgottenBlanks: entry ? entry.blanks : [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch forgotten blanks', details: err.message });
  }
});
// --- API: Update forgotten blanks for a card (per user, with analytics) ---
app.patch('/api/cards/:cardId/blanks', auth, async (req, res) => {
  try {
    const { forgottenBlanks } = req.body;
    if (!Array.isArray(forgottenBlanks)) return res.status(400).json({ error: 'forgottenBlanks array required' });
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    let entry = card.forgottenBlanks.find(e => e.user.toString() === req.userId);
    if (!entry) {
      entry = { user: req.userId, blanks: [], stats: {} };
      card.forgottenBlanks.push(entry);
    }
    // Analytics: increment stats for newly forgotten blanks
    const newlyForgotten = forgottenBlanks.filter(idx => !entry.blanks.includes(idx));
    newlyForgotten.forEach(idx => {
      entry.stats.set(idx.toString(), (entry.stats.get(idx.toString()) || 0) + 1);
    });
    entry.blanks = forgottenBlanks;
    await card.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update forgotten blanks', details: err.message });
  }
});

// Delete a card
app.delete('/api/cards/:cardId', auth, async (req, res) => {
  try {
    const card = await Card.findOneAndDelete({ _id: req.params.cardId, createdBy: req.userId });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete card', details: err.message });
  }
});

// Update card content
app.patch('/api/cards/:cardId/content', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const card = await Card.findOneAndUpdate(
      { _id: req.params.cardId, createdBy: req.userId },
      { content },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update card content', details: err.message });
  }
});

// Update keywords for a card
app.patch('/api/cards/:cardId/keywords', auth, async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!Array.isArray(keywords) || keywords.length === 0 || !keywords.every(idx => typeof idx === 'number' && Number.isInteger(idx) && idx >= 0)) {
      return res.status(400).json({ error: 'Keywords must be a non-empty array of non-negative integers (indices)'});
    }
    const card = await Card.findOneAndUpdate(
      { _id: req.params.cardId, createdBy: req.userId },
      { keywords },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update keywords', details: err.message });
  }
});

// Record review result for a card
app.patch('/api/cards/:cardId/review', auth, async (req, res) => {
  try {
    const { remembered } = req.body;
    if (typeof remembered !== 'boolean') {
      return res.status(400).json({ error: 'Remembered (boolean) is required' });
    }
    const card = await Card.findOne({ _id: req.params.cardId, createdBy: req.userId });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    card.reviewHistory.push({ date: new Date(), remembered });
    // Optionally update nextReview (spaced repetition logic)
    card.nextReview = new Date(Date.now() + (remembered ? 3 : 1) * 24 * 60 * 60 * 1000); // +3 days if remembered, +1 if not
    await card.save();
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review', details: err.message });
  }
});

// Get topic performance
app.get('/api/subjects/:subject/modules/:module/chapters/:chapter/sections/:section/topics/:topic/performance', auth, async (req, res) => {
  try {
    const cards = await Card.find({
      subject: req.params.subject,
      module: req.params.module,
      chapter: req.params.chapter,
      section: req.params.section,
      topic: req.params.topic,
      createdBy: req.userId
    });
    let total = 0, correct = 0, lastReviewed = null;
    cards.forEach(card => {
      card.reviewHistory.forEach(r => {
        total++;
        if (r.remembered) correct++;
        if (!lastReviewed || r.date > lastReviewed) lastReviewed = r.date;
      });
    });
    res.json({
      totalReviews: total,
      correct,
      accuracy: total > 0 ? correct / total : null,
      lastReviewed
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch topic performance', details: err.message });
  }
});

// Submit raw data, process into cards
app.post('/api/submit-raw', auth, async (req, res) => {
  try {
    const { subject, module, chapter, section, topic, rawText } = req.body;
    // Split into sentences, keep paragraphs
    const paragraphs = rawText.split(/\n\s*\n/).filter(Boolean);
    let created = [];
    for (let para of paragraphs) {
      const sentences = para.split(/(?<=[.!?])\s+/).filter(Boolean);
      for (let sentence of sentences) {
        const keywords = extractKeywords(sentence);
        const now = new Date();
        const card = new Card({
          subject, module, chapter, section, topic,
          content: sentence.trim(),
          keywords,
          createdBy: req.userId,
          reviewSchedule: {
            currentStage: 1,
            nextReview: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // +1 day
            log: []
          }
        });
        await card.save();
        created.push(card);
      }
    }
    res.status(201).json({ created });
  } catch (err) {
    res.status(400).json({ error: 'Failed to process raw data', details: err.message });
  }
});

// Get cards due for review (spaced repetition)
app.get('/api/review-cards', auth, async (req, res) => {
  try {
    const now = new Date();
    const cards = await Card.find({ createdBy: req.userId, nextReview: { $lte: now } });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch review cards' });
  }
});

// Delete a subject and all its nested content (cascading delete)
app.delete('/api/subjects/:subject', auth, async (req, res) => {
  try {
    const result = await Card.deleteMany({ 
      subject: req.params.subject,
      createdBy: req.userId 
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject', details: err.message });
  }
});

// Delete a module and all its nested content
app.delete('/api/subjects/:subject/modules/:module', auth, async (req, res) => {
  try {
    const result = await Card.deleteMany({ 
      subject: req.params.subject,
      module: req.params.module,
      createdBy: req.userId 
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete module', details: err.message });
  }
});

// Delete a chapter and all its nested content
app.delete('/api/subjects/:subject/modules/:module/chapters/:chapter', auth, async (req, res) => {
  try {
    const result = await Card.deleteMany({ 
      subject: req.params.subject,
      module: req.params.module,
      chapter: req.params.chapter,
      createdBy: req.userId 
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete chapter', details: err.message });
  }
});

// Delete a section and all its nested content
app.delete('/api/subjects/:subject/modules/:module/chapters/:chapter/sections/:section', auth, async (req, res) => {
  try {
    const result = await Card.deleteMany({ 
      subject: req.params.subject,
      module: req.params.module,
      chapter: req.params.chapter,
      section: req.params.section,
      createdBy: req.userId 
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete section', details: err.message });
  }
});

// Delete a topic and all its cards
app.delete('/api/subjects/:subject/modules/:module/chapters/:chapter/sections/:section/topics/:topic', auth, async (req, res) => {
  try {
    const result = await Card.deleteMany({ 
      subject: req.params.subject,
      module: req.params.module,
      chapter: req.params.chapter,
      section: req.params.section,
      topic: req.params.topic,
      createdBy: req.userId 
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete topic', details: err.message });
  }
});

// Delete a single card
app.delete('/api/cards/:cardId', auth, async (req, res) => {
  try {
    const card = await Card.findOneAndDelete({ 
      _id: req.params.cardId, 
      createdBy: req.userId 
    });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete card', details: err.message });
  }
});

// ---- Spaced Repetition Review Intervals ----
const reviewIntervals = [1, 3, 7, 14, 30, 60]; // days after learning

// ---- Endpoint: Submit a Review ----
app.post('/api/topics/:topic/review', auth, async (req, res) => {
  try {
    const { success, performance } = req.body;
    // Find all cards for this topic and user
    const cards = await Card.find({ topic: req.params.topic, createdBy: req.userId });
    if (!cards.length) return res.status(404).json({ error: 'No cards found for this topic' });
    // We'll update all cards for this topic (could optimize to a Topic collection)
    const now = new Date();
    for (const card of cards) {
      if (!card.reviewSchedule) card.reviewSchedule = { currentStage: 0, log: [] };
      let stage = card.reviewSchedule.currentStage || 0;
      if (success) {
        stage = Math.min(stage + 1, reviewIntervals.length);
      } else {
        stage = Math.max(stage - 1, 1); // Option B: partial downgrade, never below 1
      }
      // Compute next review date
      const nextInterval = reviewIntervals[stage - 1] || reviewIntervals[reviewIntervals.length - 1];
      const nextReview = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);
      // Update schedule
      card.reviewSchedule.currentStage = stage;
      card.reviewSchedule.nextReview = nextReview;
      card.reviewSchedule.log.push({ date: now, stage, success, performance });
      await card.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review', details: err.message });
  }
});

// ---- Endpoint: Get Due Reviews ----
app.get('/api/review-tasks', auth, async (req, res) => {

// ---- Endpoint: Get Tomorrow's Reviews ----
app.get('/api/review-tasks/tomorrow', auth, async (req, res) => {
  try {
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    // Find all cards due for review tomorrow (group by topic for UI)
    const dueCards = await Card.find({
      'reviewSchedule.nextReview': { $gte: tomorrowStart, $lt: tomorrowEnd },
      createdBy: req.userId
    });
    // Group by topic
    const tasksByTopic = {};
    for (const card of dueCards) {
      if (!tasksByTopic[card.topic]) tasksByTopic[card.topic] = [];
      tasksByTopic[card.topic].push(card);
    }
    res.json({ tasks: tasksByTopic });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tomorrow review tasks', details: err.message });
  }
});
  try {
    const now = new Date();
    // Find all cards due for review (group by topic for UI)
    const dueCards = await Card.find({
      'reviewSchedule.nextReview': { $lte: now },
      createdBy: req.userId
    });
    // Group by topic
    const tasksByTopic = {};
    for (const card of dueCards) {
      if (!tasksByTopic[card.topic]) tasksByTopic[card.topic] = [];
      tasksByTopic[card.topic].push(card);
    }
    res.json({ tasks: tasksByTopic });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch review tasks', details: err.message });
  }
});

// Update review result and schedule next review
app.post('/api/card-review/:id', auth, async (req, res) => {
  try {
    const { remembered } = req.body;
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    // Spaced repetition intervals (in days)
    const intervals = [1, 2, 4, 7, 14, 16, 30, 60];
    let next = new Date();
    if (remembered) {
      const n = card.reviewHistory.length;
      next.setDate(next.getDate() + (intervals[n] || 90));
    } else {
      next.setDate(next.getDate() + 1); // If forgotten, review tomorrow
    }
    card.reviewHistory.push({ date: new Date(), remembered });
    card.nextReview = next;
    await card.save();
    res.json(card);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update review', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
