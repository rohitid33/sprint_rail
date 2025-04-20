import React, { useState } from "react";
import { Box, AppBar, Toolbar, Typography, CssBaseline } from "@mui/material";
import HierarchyNavigator from './components/HierarchyNavigator';
import BottomNavBar from './components/BottomNavBar';
import TasksTab from './components/TasksTab';

function App() {
  const [navValue, setNavValue] = useState(0);
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%)', pb: 8 }}>
      <CssBaseline />
      <AppBar position="static" sx={{ bgcolor: '#1976d2', boxShadow: 2 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1 }}>Sprint</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 600, mx: 'auto', pt: 2, pb: 10 }}>
        {navValue === 2 ? <TasksTab /> : <HierarchyNavigator />}
      </Box>
      <BottomNavBar value={navValue} onChange={setNavValue} />
    </Box>
  );
}

export default App;