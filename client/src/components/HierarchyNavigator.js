import React, { useState, useEffect } from 'react';
import { Box, Paper, Button, CircularProgress, Breadcrumbs, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, IconButton } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  fetchSubjects, fetchModules, fetchChapters, fetchSections, fetchTopics, fetchCardsForTopic,
  deleteSubject, deleteModule, deleteChapter, deleteSection, deleteTopic
} from '../api';
import TopicDetail from './TopicDetail';

// Helper for fetching at each level
const levelConfig = [
  {
    label: 'Subject',
    fetchFn: fetchSubjects,
    paramKeys: [],
    paramMap: () => [],
  },
  {
    label: 'Module',
    fetchFn: fetchModules,
    paramKeys: ['subject'],
    paramMap: (params) => [params.subject],
  },
  {
    label: 'Chapter',
    fetchFn: fetchChapters,
    paramKeys: ['subject', 'module'],
    paramMap: (params) => [params.subject, params.module],
  },
  {
    label: 'Section',
    fetchFn: fetchSections,
    paramKeys: ['subject', 'module', 'chapter'],
    paramMap: (params) => [params.subject, params.module, params.chapter],
  },
  {
    label: 'Topic',
    fetchFn: fetchTopics,
    paramKeys: ['subject', 'module', 'chapter', 'section'],
    paramMap: (params) => [params.subject, params.module, params.chapter, params.section],
  },
  {
    label: 'Card',
    fetchFn: fetchCardsForTopic,
    paramKeys: ['subject', 'module', 'chapter', 'section', 'topic'],
    paramMap: (params) => [params.subject, params.module, params.chapter, params.section, params.topic],
  },
];

export default function HierarchyNavigator() {
  // ...existing state
  const [renameDialog, setRenameDialog] = useState({ open: false, oldName: '', idx: null, newName: '' });
  // ...existing state

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [path, setPath] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sprint_path')) || [];
    } catch { return []; }
  });
  const [topicDetail, setTopicDetail] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sprint_topicDetail')) || null;
    } catch { return null; }
  });

  const currentLevel = path.length;
  const params = Object.fromEntries(
    path.map((p, idx) => [levelConfig[idx].label.toLowerCase(), p.value])
  );
  const { fetchFn, label, paramMap } = levelConfig[currentLevel];
  const queryKey = [label.toLowerCase(), ...paramMap(params)];
  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchFn(...paramMap(params)),
    enabled: !!fetchFn,
  });
  const queryClient = useQueryClient();

  const handleSelect = (value) => {
    if (label === 'Topic') {
      setTopicDetail({ ...params, topic: value });
    } else {
      setPath([...path, { level: currentLevel, value }]);
    }
  };

  // Persist path and topicDetail to localStorage
  useEffect(() => {
    localStorage.setItem('sprint_path', JSON.stringify(path));
  }, [path]);
  useEffect(() => {
    localStorage.setItem('sprint_topicDetail', JSON.stringify(topicDetail));
  }, [topicDetail]);

  const handleBreadcrumb = (idx) => {
    setPath(path.slice(0, idx + 1));
    setTopicDetail(null);
  };

  if (topicDetail) {
    return <TopicDetail {...topicDetail} onBack={() => setTopicDetail(null)} />;
  }

  // Helper for calling the correct rename API
  const handleRename = async (oldName, newName) => {
    try {
      if (!newName || newName === oldName) return;
      if (label === 'Module') {
        await require('../api').renameModule(params.subject, oldName, newName);
      } else if (label === 'Chapter') {
        await require('../api').renameChapter(params.subject, params.module, oldName, newName);
      } else if (label === 'Section') {
        await require('../api').renameSection(params.subject, params.module, params.chapter, oldName, newName);
      } else if (label === 'Topic') {
        await require('../api').renameTopic(params.subject, params.module, params.chapter, params.section, oldName, newName);
      } else {
        throw new Error('Renaming not supported for this level');
      }
      queryClient.invalidateQueries(queryKey);
      setSnackbarMessage(`${label} renamed successfully!`);
      setSnackbarSeverity('success');
    } catch (err) {
      setSnackbarMessage(err?.response?.data?.error || `Failed to rename ${label}`);
      setSnackbarSeverity('error');
    }
    setRenameDialog({ open: false, oldName: '', idx: null, newName: '' });
  };

  return (
    <>
      <Paper sx={{ p: 2, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Button onClick={() => { setPath([]); setTopicDetail(null); }} size="small">Subjects</Button>
          {path.map((p, idx) => (
            <Button key={idx} onClick={() => handleBreadcrumb(idx)} size="small">{p.value}</Button>
          ))}
        </Breadcrumbs>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Select {label}</Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<AddCircleIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{ fontWeight: 700, borderRadius: 3, boxShadow: 2, px: 2 }}
          >
            Add {label}
          </Button>
        </Box>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {data.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'grey.500' }}>
                <Typography variant="h5" gutterBottom>No {label.toLowerCase()}s yet</Typography>
                <Typography variant="body2">Click "+ Add {label}" to get started!</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.map((item, idx) => (
                  <Paper
                    key={idx}
                    elevation={2}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 3,
                      px: 2,
                      py: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'box-shadow 0.2s, background 0.2s',
                      '&:hover': {
                        boxShadow: 8,
                        bgcolor: 'primary.50',
                      },
                    }}
                    onClick={() => handleSelect(item)}
                  >
                    <Box sx={{ mr: 1, color: 'primary.main' }}>
                      {/* Icon for each level */}
                      {label === 'Subject' && <span role="img" aria-label="subject">📚</span>}
                      {label === 'Module' && <span role="img" aria-label="module">📦</span>}
                      {label === 'Chapter' && <span role="img" aria-label="chapter">📖</span>}
                      {label === 'Section' && <span role="img" aria-label="section">🗂️</span>}
                      {label === 'Topic' && <span role="img" aria-label="topic">🔖</span>}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500, flexGrow: 1 }}>
                      {typeof item === 'string' ? item : item.content || item._id}
                    </Typography>
                    {/* Edit (rename) button */}
                    {label !== 'Card' && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={e => {
                          e.stopPropagation();
                          setRenameDialog({ open: true, oldName: item, idx });
                        }}
                        aria-label={`Rename ${label}`}
                      >
                        <span role="img" aria-label="edit">✏️</span>
                      </IconButton>
                    )}
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ 
                        opacity: 0.7,
                        '&:hover': { opacity: 1 }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
        {/* Add Subject Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
            <DialogTitle>Add New {label}</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label={`${label} Name`}
                fullWidth
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                disabled={adding}
                error={!!addError}
                helperText={addError}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAddDialogOpen(false)} disabled={adding}>Cancel</Button>
              <Button onClick={async () => {
                setAddError("");
                if (!newItem.trim()) {
                  setAddError(`${label} name is required`);
                  return;
                }
                setAdding(true);
                try {
                  const api = await import('../api');
                  if (label === 'Subject') {
                    await api.addSubject(newItem.trim());
                    queryClient.invalidateQueries(['subject']);
                  } else if (label === 'Module') {
                    await api.addModule(params.subject, newItem.trim());
                    queryClient.invalidateQueries(['module', params.subject]);
                  } else if (label === 'Chapter') {
                    await api.addChapter(params.subject, params.module, newItem.trim());
                    queryClient.invalidateQueries(['chapter', params.subject, params.module]);
                  } else if (label === 'Section') {
                    await api.addSection(params.subject, params.module, params.chapter, newItem.trim());
                    queryClient.invalidateQueries(['section', params.subject, params.module, params.chapter]);
                  } else if (label === 'Topic') {
                    await api.addTopic(params.subject, params.module, params.chapter, params.section, newItem.trim());
                    queryClient.invalidateQueries(['topic', params.subject, params.module, params.chapter, params.section]);
                  }
                  setAddDialogOpen(false);
                  setNewItem("");
                  setSnackbarMessage(`${label} added successfully`);
                  setSnackbarSeverity("success");
                  setSnackbarOpen(true);
                } catch (err) {
                  setAddError(`Failed to add ${label.toLowerCase()}`);
                } finally {
                  setAdding(false);
                }
              }} disabled={adding || !newItem.trim()} variant="contained">Add</Button>
            </DialogActions>
          </Dialog>
      </Paper>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2500}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage || `${label} added successfully!`}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete {label}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete "{typeof itemToDelete === 'string' ? itemToDelete : (itemToDelete?.content || itemToDelete?._id)}"?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Warning: This will also delete all nested items within this {label.toLowerCase()}!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button 
            onClick={async () => {
              setDeleting(true);
              try {
                // Extract the string value from the item (which might be an object or a string)
                const itemValue = typeof itemToDelete === 'string' ? itemToDelete : (itemToDelete?.content || itemToDelete?._id);
                
                if (label === 'Subject') {
                  await deleteSubject(itemValue);
                  queryClient.invalidateQueries(['subject']);
                } else if (label === 'Module') {
                  await deleteModule(params.subject, itemValue);
                  queryClient.invalidateQueries(['module', params.subject]);
                } else if (label === 'Chapter') {
                  await deleteChapter(params.subject, params.module, itemValue);
                  queryClient.invalidateQueries(['chapter', params.subject, params.module]);
                } else if (label === 'Section') {
                  await deleteSection(params.subject, params.module, params.chapter, itemValue);
                  queryClient.invalidateQueries(['section', params.subject, params.module, params.chapter]);
                } else if (label === 'Topic') {
                  await deleteTopic(params.subject, params.module, params.chapter, params.section, itemValue);
                  queryClient.invalidateQueries(['topic', params.subject, params.module, params.chapter, params.section]);
                }
                setDeleteDialogOpen(false);
                setSnackbarMessage(`${label} deleted successfully`);
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
              } catch (err) {
                console.error('Delete error:', err);
                setSnackbarMessage(`Failed to delete ${label.toLowerCase()}`);
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
              } finally {
                setDeleting(false);
              }
            }} 
            disabled={deleting} 
            variant="contained" 
            color="error"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Rename dialog */}
      <Dialog open={renameDialog.open} onClose={() => setRenameDialog({ open: false, oldName: '', idx: null, newName: '' })}>
        <DialogTitle>Rename {label}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`New ${label} Name`}
            fullWidth
            value={renameDialog.newName || renameDialog.oldName}
            onChange={e => setRenameDialog(rd => ({ ...rd, newName: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename(renameDialog.oldName, renameDialog.newName || renameDialog.oldName);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog({ open: false, oldName: '', idx: null, newName: '' })}>Cancel</Button>
          <Button onClick={() => handleRename(renameDialog.oldName, renameDialog.newName || renameDialog.oldName)} variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}


