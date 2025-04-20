import React, { useState } from 'react';

import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Stack, Paper, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCardsForTopic, fetchTopicPerformance, addCardToTopic, reviewCard, deleteCard, reorderCards, updateCardKeywords, updateCardContent } from '../api';
import Blank from './Blank';

export default function TopicDetail({ subject, module, chapter, section, topic, onBack }) {
  // Tabs state (persisted in localStorage)
  const [tab, setTab] = useState(() => localStorage.getItem('topicDetailTab') || 'cards');
  // Persist tab selection
  React.useEffect(() => {
    localStorage.setItem('topicDetailTab', tab);
  }, [tab]);
  // Track card click counts for this session

  // ...
  // (keep all other hooks and logic)


  const queryClient = useQueryClient();
  // Performance stats
  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['topicPerformance', subject, module, chapter, section, topic],
    queryFn: () => fetchTopicPerformance(subject, module, chapter, section, topic),
    enabled: !!topic,
  });
  // Cards
  const { data: cardsData = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['cards', subject, module, chapter, section, topic],
    queryFn: () => fetchCardsForTopic(subject, module, chapter, section, topic),
    enabled: !!topic,
  });
  const [cards, setCards] = useState([]);
  React.useEffect(() => {
    setCards(cardsData);
  }, [cardsData]);
  // Add card modal
  const [addOpen, setAddOpen] = useState(false);
  const [newCard, setNewCard] = useState('');
  const addCardMutation = useMutation({
    mutationFn: (content) => addCardToTopic(subject, module, chapter, section, topic, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['cards', subject, module, chapter, section, topic]);
      setNewCard('');
      setAddOpen(false);
    }
  });

  // Edit card modal
  const [editCardModal, setEditCardModal] = useState({ open: false, card: null, value: '' });
  const editCardMutation = useMutation({
    mutationFn: ({ cardId, content }) => updateCardContent(cardId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['cards', subject, module, chapter, section, topic]);
      setEditCardModal({ open: false, card: null, value: '' });
    }
  });
  const handleOpenEditCard = (card) => {
    setEditCardModal({ open: true, card, value: card.content });
  };
  const handleCloseEditCard = () => {
    setEditCardModal({ open: false, card: null, value: '' });
  };
  const handleSaveEditCard = () => {
    if (editCardModal.card && editCardModal.value.trim()) {
      editCardMutation.mutate({ cardId: editCardModal.card._id, content: editCardModal.value });
    }
  };
  // Review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);

  const [sessionScore, setSessionScore] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  // Track reviewMode for review modal


  // --- Forgotten Blanks State ---
  const [forgottenBlanks, setForgottenBlanks] = useState([]);
  // Fetch forgotten blanks for the current card in review
  React.useEffect(() => {
    async function fetchBlanks() {
      if (reviewOpen && cards[reviewIdx]?._id) {
        try {
          const res = await import('../api').then(api => api.fetchForgottenBlanks(cards[reviewIdx]._id));
          setForgottenBlanks(res.forgottenBlanks || []);
        } catch (err) {
          setForgottenBlanks([]);
        }
      }
    }
    fetchBlanks();
  }, [reviewOpen, reviewIdx, cards]);
  // Handler to toggle forgotten state
  const handleToggleForgotten = async (blankIdx, forgotten) => {
    let updated = forgotten
      ? [...new Set([...forgottenBlanks, blankIdx])] // add
      : forgottenBlanks.filter(idx => idx !== blankIdx); // remove
    setForgottenBlanks(updated);
    // Persist to backend
    try {
      await import('../api').then(api => api.updateForgottenBlanks(cards[reviewIdx]._id, updated));
    } catch {}
  };
  const reviewMutation = useMutation({
    mutationFn: ({ cardId, remembered }) => reviewCard(cardId, remembered),
    onSuccess: () => {
      queryClient.invalidateQueries(['cards', subject, module, chapter, section, topic]);
      queryClient.invalidateQueries(['topicPerformance', subject, module, chapter, section, topic]);
    }
  });

  // Start review
  const handleCloseReview = () => {
    setReviewOpen(false);
    // After review session, update forgottenBlanks for the reviewed card
    setCards(prevCards => {
      if (!cards[reviewIdx]?._id) return prevCards;
      return prevCards.map(card =>
        card._id === cards[reviewIdx]._id
          ? { ...card, forgottenBlanks: forgottenBlanks }
          : card
      );
    });
  };
  const handleStart = () => {
    setReviewIdx(0);
    setSessionScore(0);
    setSessionDone(false);
    // Reset forgottenBlanks for all cards
    setCards(prevCards => prevCards.map(card => ({ ...card, forgottenBlanks: [] })));
    setReviewOpen(true);
  };

  // Review action
  const handleReview = (remembered) => {
    const card = cards[reviewIdx];
    reviewMutation.mutate({ cardId: card._id, remembered });
    if (remembered) setSessionScore(s => s + 1);
    if (reviewIdx + 1 < cards.length) {
      setReviewIdx(i => i + 1);

    } else {
      setSessionDone(true);
    }
  };
  // --- Drag and Drop (Reorder) ---

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(cards);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setCards(reordered); // Update local state for instant feedback
    try {
      await reorderCards(subject, module, chapter, section, topic, reordered.map(c => c._id));
      queryClient.invalidateQueries(['cards', subject, module, chapter, section, topic]);
    } catch (err) {}
  };


  // --- Delete Card ---
  const handleDeleteCard = (card) => {
    if (window.confirm('Delete this card?')) {
      deleteCard(card._id).then(() => {
        queryClient.invalidateQueries(['cards', subject, module, chapter, section, topic]);
      });
    }
  };

  // --- Keyword Editing State ---
  const [editKeywordsCard, setEditKeywordsCard] = useState(null);
  const [editKeywordsLoading, setEditKeywordsLoading] = useState(false);
  const handleOpenEditKeywords = (card) => {
    setEditKeywordsCard({ ...card, keywordIndices: Array.isArray(card.keywords) ? card.keywords : [] });
  };
  const handleToggleKeyword = (idx) => {
    let indices = Array.isArray(editKeywordsCard.keywordIndices) ? [...editKeywordsCard.keywordIndices] : [];
    if (indices.includes(idx)) {
      indices = indices.filter(i => i !== idx);
    } else {
      indices.push(idx);
    }
    setEditKeywordsCard({ ...editKeywordsCard, keywordIndices: indices });
  };
  const handleCloseEditKeywords = () => {
    setEditKeywordsCard(null);
    setEditKeywordsLoading(false);
  };
  const handleSaveEditKeywords = async () => {
    setEditKeywordsLoading(true);
    try {
      await updateCardKeywords(editKeywordsCard._id, editKeywordsCard.keywordIndices);
      queryClient.invalidateQueries(['cards', subject, module, chapter, section, topic]);
      handleCloseEditKeywords();
    } catch (err) {
      setEditKeywordsLoading(false);
    }
  };

  function highlightKeywords(text, keywordIndices, asBlanks = false, forgottenBlanks = [], onToggleForgotten = () => {}) {
    if (!Array.isArray(keywordIndices) || keywordIndices.length === 0)
      return <span style={{ whiteSpace: 'pre-line' }}>{text}</span>;
    const words = text.split(/(\s+)/); // keep spaces as tokens
    let wordCounter = -1;
    const highlighted = words.map((word, idx) => {
      if (/^\s+$/.test(word)) return word;
      wordCounter++;
      if (keywordIndices.includes(wordCounter)) {
        if (asBlanks) {
          return (
            <Blank
              key={idx}
              idx={wordCounter}
              word={word}
              forgotten={forgottenBlanks.includes(wordCounter)}
              onToggleForgotten={onToggleForgotten}
            />
          );
        } else {
          // In cards view, highlight forgotten keywords in red
        if (forgottenBlanks && forgottenBlanks.includes(wordCounter)) {
          return <mark key={idx} style={{ background: '#ffcccc', color: '#b71c1c' }}>{word}</mark>;
        }
        return <mark key={idx}>{word}</mark>;
        }
      }
      return word;
    });
    return <span style={{ whiteSpace: 'pre-line' }}>{highlighted}</span>;
  }

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      {/* Breadcrumb navigation */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Typography
          variant="body2"
          color="primary"
          sx={{ cursor: subject ? 'pointer' : 'default', fontWeight: 500 }}
          onClick={subject ? () => onBack('subject') : undefined}
        >
          {subject}
        </Typography>
        {module && <>
          <Typography color="text.secondary">/</Typography>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => onBack('module')}
          >
            {module}
          </Typography>
        </>}
        {chapter && <>
          <Typography color="text.secondary">/</Typography>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => onBack('chapter')}
          >
            {chapter}
          </Typography>
        </>}
        {section && <>
          <Typography color="text.secondary">/</Typography>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => onBack('section')}
          >
            {section}
          </Typography>
        </>}
        {topic && <>
          <Typography color="text.secondary">/</Typography>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 700 }}>{topic}</Typography>
        </>}
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Topic: {topic}</Typography>
        <Button onClick={onBack}>Back</Button>
      </Stack>
      {perfLoading ? <CircularProgress /> : performance && (
        <Box mb={2}>
          <Typography variant="subtitle2">Performance</Typography>
          <Typography variant="body2">Accuracy: {performance.accuracy !== null ? (performance.accuracy * 100).toFixed(1) + '%' : 'N/A'}</Typography>
          <Typography variant="body2">Total Reviews: {performance.totalReviews}</Typography>
          <Typography variant="body2">Correct: {performance.correct}</Typography>
          <Typography variant="body2">Last Reviewed: {performance.lastReviewed ? new Date(performance.lastReviewed).toLocaleString() : 'Never'}</Typography>
        </Box>
      )}
      <Stack direction="row" spacing={2} mb={2}>
        <Button variant="contained" onClick={handleStart} disabled={cards.length === 0}>Start</Button>
      </Stack>
      {/* Tabs for Cards/Improve */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Stack direction="row" spacing={2}>
          <Button variant={tab === 'cards' ? 'contained' : 'text'} onClick={() => {
            setTab('cards');
            localStorage.setItem('topicDetailTab', 'cards');
          }}>Cards</Button>
          <Button variant={tab === 'improve' ? 'contained' : 'text'} onClick={() => {
            setTab('improve');
            localStorage.setItem('topicDetailTab', 'improve');
          }}>Improve</Button>
        </Stack>
      </Box>
      <Typography variant="subtitle2" mb={1}>Cards in this topic: <b>{cards.length}</b></Typography>
      {cardsLoading ? <CircularProgress /> : (
        <Box>
          {cards.length === 0 ? <Typography>No cards yet.</Typography> : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="card-list">
                {(provided) => (
                  <ul
                  className="card-list"
                  style={{ paddingLeft: 0, listStyle: 'none' }}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {cards.map((card, idx) => (
                    <Draggable key={card._id} draggableId={card._id} index={idx}>
                      {(provided, snapshot) => (
                        <li
                          className="card-list-item"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            background: snapshot.isDragging ? '#f5f5f5' : 'inherit',
                            borderRadius: 4,
                          }}
                        >
                          <span>
                            {highlightKeywords(
  card.content,
  card.keywords,
  tab === 'improve' ? false : false,
  tab === 'improve' ? card.forgottenBlanks : undefined
)}
                          </span>
                          <Button size="small" sx={{ ml: 1 }} onClick={() => handleOpenEditCard(card)}>
                            Edit
                          </Button>
                          <Button size="small" sx={{ ml: 1 }} onClick={() => handleOpenEditKeywords(card)}>
                            Edit Keywords
                          </Button>
                          <IconButton size="small" color="error" sx={{ ml: 1 }} onClick={() => handleDeleteCard(card)}>
                            <DeleteIcon />
                          </IconButton>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Box>
      )}

      {/* Add Card Button at the bottom */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="outlined" onClick={() => setAddOpen(true)}>Add Card</Button>
      </Box>

      {/* Edit Keywords Dialog */}
      <Dialog open={!!editKeywordsCard} onClose={handleCloseEditKeywords}>
        <DialogTitle>Edit Keywords</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {editKeywordsCard && editKeywordsCard.content.split(/\s+/).map((word, idx) => {
              const isSelected = Array.isArray(editKeywordsCard.keywordIndices) && editKeywordsCard.keywordIndices.includes(idx);
              return (
                <Button
                  key={idx}
                  variant={isSelected ? 'contained' : 'outlined'}
                  color={isSelected ? 'warning' : 'primary'}
                  size="small"
                  sx={{ minWidth: 0, px: 1, fontWeight: isSelected ? 'bold' : 'normal', bgcolor: isSelected ? '#ffe082' : undefined }}
                  onClick={() => handleToggleKeyword(idx)}
                >
                  {word}
                </Button>
              );
            })}
          </Box>
          <Typography variant="caption" color="text.secondary">Select any words to highlight as keywords.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditKeywords}>Cancel</Button>
          <Button onClick={handleSaveEditKeywords} disabled={editKeywordsLoading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add Card Modal */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="md" fullWidth>
  <DialogTitle>Add Card</DialogTitle>
  <DialogContent>
    <TextField
      autoFocus
      margin="dense"
      label="Card Content"
      fullWidth
      multiline
      minRows={8}
      value={newCard}
      onChange={e => setNewCard(e.target.value)}
      inputProps={{ style: { fontFamily: 'inherit', whiteSpace: 'pre-line' } }}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setAddOpen(false)}>Cancel</Button>
    <Button onClick={() => addCardMutation.mutate(newCard)} disabled={!newCard.trim() || addCardMutation.isLoading}>Add</Button>
  </DialogActions>
</Dialog>
      {/* Edit Card Modal */}
      <Dialog open={editCardModal.open} onClose={handleCloseEditCard} maxWidth="md" fullWidth>
        <DialogTitle>Edit Card</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="normal"
            label="Card Content"
            fullWidth
            multiline
            minRows={4}
            maxRows={8}
            value={editCardModal.value}
            onChange={e => setEditCardModal(modal => ({ ...modal, value: e.target.value }))}
            sx={{
              fontSize: '1.1rem',
              background: '#fafbfc',
              borderRadius: 2,
              width: '100%',
              maxWidth: { xs: '100%', sm: '600px', md: '900px' },
              alignSelf: 'center',
              '& .MuiInputBase-root': {
                padding: '14px',
                fontSize: '1.1rem',
                minHeight: '120px',
                lineHeight: 1.6
              },
              '& textarea': {
                resize: 'vertical',
                minHeight: '80px',
                maxHeight: '220px',
                width: '100%'
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditCard}>Cancel</Button>
          <Button onClick={handleSaveEditCard} disabled={editCardMutation.isLoading || !editCardModal.value.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
      {/* Review Modal */}
      <Dialog open={reviewOpen} onClose={handleCloseReview} maxWidth="sm" fullWidth>
        <DialogTitle>Review Cards</DialogTitle>
        <DialogContent>
          {sessionDone ? (
            <Box textAlign="center">
              <Typography variant="h6">Session Complete!</Typography>
              <Typography>Score: {sessionScore} / {cards.length}</Typography>
              <Button onClick={() => setReviewOpen(false)}>Close</Button>
            </Box>
          ) : cards[reviewIdx] ? (
            <Box>
              <Typography sx={{ mb: 2 }}>
                {highlightKeywords(
  cards[reviewIdx].content,
  cards[reviewIdx].keywords,
  true,
  forgottenBlanks,
  handleToggleForgotten
)}
              </Typography>

              <Stack direction="row" spacing={2} justifyContent="center" mb={2}>
                <Button variant="contained" color="success" onClick={() => handleReview(true)} disabled={reviewMutation.isLoading}>Yes</Button>
                <Button variant="contained" color="error" onClick={() => handleReview(false)} disabled={reviewMutation.isLoading}>No</Button>
              </Stack>
              <Typography variant="body2">Card {reviewIdx + 1} of {cards.length}</Typography>
              <Typography variant="body2">Score: {sessionScore}</Typography>
            </Box>
          ) : <CircularProgress />}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
