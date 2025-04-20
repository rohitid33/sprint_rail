import React, { useState } from 'react';
import { Box, Button, TextField, Paper, Stack, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

import CircularProgress from '@mui/material/CircularProgress';

export default function SubjectList({ subjects, onAddSubject, loading }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');

  const filtered = subjects.filter(s => s && s.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = () => {
    if (newSubject.trim()) {
      onAddSubject(newSubject.trim());
      setNewSubject('');
      setOpen(false);
    }
  };

  return (
    <Paper sx={{ p: 2, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <TextField
          placeholder="Search subjects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          size="small"
          fullWidth
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Subject
        </Button>
      </Stack>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {filtered.length === 0 && <ListItem><ListItemText primary="No subjects found." /></ListItem>}
          {filtered.map((subject, idx) => (
            <ListItem key={idx} divider>
              <ListItemText primary={subject} />
            </ListItem>
          ))}
        </List>
      )}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add New Subject</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Subject Name"
            fullWidth
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
