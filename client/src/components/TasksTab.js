import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Stack, Snackbar } from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';


// Fetch due review tasks
const fetchReviewTasks = async () => {
  const token = localStorage.getItem('token') || '';
  const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/review-tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch review tasks');
  return res.json();
};

// Submit review result for a topic
const submitReview = async ({ topic, success, performance }) => {
  const token = localStorage.getItem('token') || '';
  const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/topics/${encodeURIComponent(topic)}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ success, performance }),
  });
  if (!res.ok) throw new Error('Failed to submit review');
  return res.json();
};

export default function TasksTab() {
  // Fetch tomorrow's review tasks
const fetchTomorrowTasks = async () => {
  const token = localStorage.getItem('token') || '';
  const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/review-tasks/tomorrow`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch tomorrow review tasks');
  return res.json();
};

const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['review-tasks'],
  queryFn: fetchReviewTasks
});
const { data: tomorrowData, isLoading: tomorrowLoading, error: tomorrowError } = useQuery({
  queryKey: ['review-tasks-tomorrow'],
  queryFn: fetchTomorrowTasks
});
const [snackbar, setSnackbar] = React.useState('');
const mutation = useMutation({
  mutationFn: submitReview,
  onSuccess: () => {
    setSnackbar('Review submitted!');
    refetch();
  },
  onError: () => setSnackbar('Failed to submit review'),
});

if (isLoading || tomorrowLoading) return <Box sx={{ pt: 5, textAlign: 'center' }}><CircularProgress /></Box>;
if (error || tomorrowError) return <Typography color="error">Failed to load tasks.</Typography>;

const tasks = data?.tasks || {};
const topics = Object.keys(tasks);
const tomorrowTasks = tomorrowData?.tasks || {};
const tomorrowTopics = Object.keys(tomorrowTasks);

return (
  <Box>
    <Typography variant="h6" sx={{ mb: 2, mt: 1 }}>
      <AssignmentTurnedInIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Tasks Due for Review
    </Typography>
    {/* Today Section */}
    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>Today</Typography>
    {topics.length === 0 && <Typography>No topics due for review today!</Typography>}
    <Stack spacing={2}>
      {topics.map(topic => (
        <Card key={topic} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{topic}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {tasks[topic].length} card(s) due for review
            </Typography>
            <Button
              variant="contained"
              color="success"
              sx={{ mr: 1 }}
              onClick={() => mutation.mutate({ topic, success: true, performance: 100 })}
              disabled={mutation.isLoading}
            >
              Mark as Remembered
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => mutation.mutate({ topic, success: false, performance: 0 })}
              disabled={mutation.isLoading}
            >
              Mark as Forgotten
            </Button>
          </CardContent>
        </Card>
      ))}
    </Stack>
    {/* Tomorrow Section */}
    <Typography variant="subtitle1" sx={{ mt: 4, mb: 1, fontWeight: 700 }}>Tomorrow</Typography>
    {tomorrowTopics.length === 0 && <Typography>No topics due for review tomorrow!</Typography>}
    <Stack spacing={2}>
      {tomorrowTopics.map(topic => (
        <Card key={topic} variant="outlined" sx={{ opacity: 0.7 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{topic}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {tomorrowTasks[topic].length} card(s) scheduled for review
            </Typography>
            {/* No action buttons for tomorrow's tasks */}
          </CardContent>
        </Card>
      ))}
    </Stack>
    <Snackbar
      open={!!snackbar}
      autoHideDuration={2000}
      onClose={() => setSnackbar('')}
      message={snackbar}
    />
  </Box>
);
}
