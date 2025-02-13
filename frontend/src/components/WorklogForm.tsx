import React, { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  Typography,
  Box,
  Grid,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  Checkbox,
  MenuItem
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useNavigate, useParams } from 'react-router-dom';
import { format, getISOWeek } from 'date-fns';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { collection } from 'firebase/firestore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { db as indexedDB } from '../utils/db';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface Task {
  task: string;
  completed: boolean;
  timeSpent: number;
}

interface WorklogFormData {
  date: Date;
  hours: number;
  projectTitle: string;
  phase: string;
  plannedTasks: Task[];
  administrativeTasks: Task[];
}

const phases = [
  'Voorbereiding',
  'Fase 1 - Tijdelijke netwerk',
  'Fase 2 - Bekabelingswerken',
  'Fase 3 - Uitrol netwerk'
];

const emptyWorklog: WorklogFormData = {
  date: new Date(),
  hours: 0,
  projectTitle: 'Project Netwerkvernieuwing GBS Tilia',
  phase: '',
  plannedTasks: [{ task: '', completed: false, timeSpent: 0 }],
  administrativeTasks: [{ task: '', completed: false, timeSpent: 0 }]
};

const WorklogForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [formData, setFormData] = useState<WorklogFormData>(emptyWorklog);

  useEffect(() => {
    if (id) {
      fetchWorklog();
    }
  }, [id]);

  const fetchWorklog = async () => {
    if (!id) return;
    
    const worklogDoc = await getDoc(doc(db, 'worklogs', id));
    if (worklogDoc.exists()) {
      const data = worklogDoc.data();
      setFormData({
        date: new Date(data.date),
        hours: data.hours || 8,
        projectTitle: data.projectTitle || 'Project Netwerkvernieuwing GBS Tilia',
        phase: data.phase || '',
        plannedTasks: data.plannedTasks || [],
        administrativeTasks: data.administrativeTasks || []
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const worklogData = {
      userId: user.id,
      date: format(formData.date, 'yyyy-MM-dd'),
      hours: formData.hours,
      projectTitle: formData.projectTitle,
      phase: formData.phase,
      plannedTasks: formData.plannedTasks,
      administrativeTasks: formData.administrativeTasks,
      syncStatus: 'pending' as const
    };

    try {
      const localId = await indexedDB.worklogs.add(worklogData);

      try {
        if (id) {
          await updateDoc(doc(db, 'worklogs', id), worklogData);
        } else {
          const newWorklogRef = doc(collection(db, 'worklogs'));
          await setDoc(newWorklogRef, {
            ...worklogData,
            createdAt: new Date().toISOString()
          });
        }
        await indexedDB.worklogs.update(localId, { syncStatus: 'synced' });
      } catch (error) {
        console.error('Sync error:', error);
      }

      navigate('/');
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const addTask = (type: 'plannedTasks' | 'administrativeTasks') => {
    setFormData({
      ...formData,
      [type]: [...formData[type], { task: '', completed: false, timeSpent: 0 }]
    });
  };

  const removeTask = (type: 'plannedTasks' | 'administrativeTasks', index: number) => {
    setFormData({
      ...formData,
      [type]: formData[type].filter((_, i) => i !== index)
    });
  };

  const handleTaskChange = (type: 'plannedTasks' | 'administrativeTasks', index: number, value: string) => {
    const newTasks = [...formData[type]];
    newTasks[index] = { ...newTasks[index], task: value };
    setFormData({ ...formData, [type]: newTasks });
  };

  const toggleTaskCompletion = (type: 'plannedTasks' | 'administrativeTasks', index: number) => {
    const newTasks = [...formData[type]];
    newTasks[index] = { ...newTasks[index], completed: !newTasks[index].completed };
    setFormData({ ...formData, [type]: newTasks });
  };

  const moveTask = (type: 'plannedTasks' | 'administrativeTasks', index: number, direction: 'up' | 'down') => {
    const tasks = [...formData[type]];
    if (direction === 'up' && index > 0) {
      [tasks[index], tasks[index - 1]] = [tasks[index - 1], tasks[index]];
    } else if (direction === 'down' && index < tasks.length - 1) {
      [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
    }
    setFormData({ ...formData, [type]: tasks });
  };

  const handleTimeChange = (type: 'plannedTasks' | 'administrativeTasks', index: number, value: string) => {
    const newTasks = [...formData[type]];
    const timeSpent = Math.max(0, Math.round(parseFloat(value || '0') * 4) / 4);
    newTasks[index] = { ...newTasks[index], timeSpent };
    
    const totalTime = [
      ...(type === 'plannedTasks' ? newTasks : formData.plannedTasks),
      ...(type === 'administrativeTasks' ? newTasks : formData.administrativeTasks)
    ].reduce((sum, task) => sum + (task.timeSpent || 0), 0);
    
    setFormData({ 
      ...formData, 
      [type]: newTasks,
      hours: totalTime
    });
  };

  const renderTaskList = (type: 'plannedTasks' | 'administrativeTasks') => (
    <>
      <Box sx={{ 
        display: 'flex', 
        bgcolor: 'grey.100',
        p: 1,
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="h6" component="div">
          {type === 'plannedTasks' ? 'Geplande Taken / Doelen' : 'Administratieve / Overige Taken'}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          mr: 11.5
        }}>
          <AccessTimeIcon fontSize="small" />
          <Typography 
            variant="caption" 
            sx={{ 
              lineHeight: 1, 
              fontSize: '0.7rem',
              whiteSpace: 'pre-line',
              display: 'block'
            }}
          >
            {'Gew.\ntijd'}
          </Typography>
        </Box>
      </Box>

      <List sx={{ py: 0 }}>
        {formData[type].map((task, index) => (
          <ListItem key={index} sx={{ 
            py: 0.25,
            '& .MuiTextField-root': {
              my: 0.25
            }
          }}>
            <Checkbox
              checked={task.completed}
              onChange={() => toggleTaskCompletion(type, index)}
            />
            <TextField
              fullWidth
              multiline
              value={task.task}
              onChange={(e) => handleTaskChange(type, index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  const newValue = task.task + '\n';
                  handleTaskChange(type, index, newValue);
                }
              }}
              sx={{ 
                mx: 1,
                '& .MuiInputBase-input': {
                  color: task.completed ? 'success.main' : 'inherit'
                }
              }}
            />
            <TextField
              type="number"
              value={task.timeSpent || ''}
              onChange={(e) => handleTimeChange(type, index, e.target.value)}
              inputProps={{ 
                step: 0.25,
                min: 0,
                style: { 
                  width: '60px',
                  color: task.completed ? 'success.main' : 'inherit'
                }
              }}
              sx={{ 
                width: '100px', 
                mr: 1,
                '& .MuiInputBase-input': {
                  py: 0.75
                }
              }}
            />
            <Box>
              <IconButton 
                onClick={() => moveTask(type, index, 'up')}
                disabled={index === 0}
                size="small"
              >
                <ArrowUpwardIcon />
              </IconButton>
              <IconButton 
                onClick={() => moveTask(type, index, 'down')}
                disabled={index === formData[type].length - 1}
                size="small"
              >
                <ArrowDownwardIcon />
              </IconButton>
              <IconButton onClick={() => removeTask(type, index)} size="small">
                <DeleteIcon />
              </IconButton>
            </Box>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <form onSubmit={handleSubmit}>
      <Paper elevation={3}>
        <Box p={3}>
          <Grid container spacing={3}>
            {/* Header met datum en uren */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <DatePicker
                  label="Datum"
                  value={formData.date}
                  onChange={(newDate) => newDate && setFormData({ ...formData, date: newDate })}
                  format="dd MMMM yyyy"
                />
                <TextField
                  type="number"
                  label="Aantal uren"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: Math.round(parseFloat(e.target.value) * 4) / 4 })}
                  inputProps={{ 
                    step: 0.25,
                    min: 0
                  }}
                  sx={{ width: 100 }}
                />
                <Typography variant="h6">
                  Week: {getISOWeek(formData.date)}
                </Typography>
              </Box>
            </Grid>

            {/* Project Titel en Fase */}
            <Grid item xs={12} container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Project Titel"
                  value={formData.projectTitle}
                  onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Fase"
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                >
                  <MenuItem value="">Selecteer een fase</MenuItem>
                  {phases.map((phase) => (
                    <MenuItem key={phase} value={phase}>
                      {phase}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* Geplande Taken */}
            <Grid item xs={12}>
              {renderTaskList('plannedTasks')}
              <Button
                startIcon={<AddIcon />}
                onClick={() => addTask('plannedTasks')}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Taak toevoegen
              </Button>
            </Grid>

            {/* Administratieve / Overige Taken */}
            <Grid item xs={12}>
              {renderTaskList('administrativeTasks')}
              <Button
                startIcon={<AddIcon />}
                onClick={() => addTask('administrativeTasks')}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Taak toevoegen
              </Button>
            </Grid>

            {/* Knoppen */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button variant="outlined" onClick={() => navigate('/')}>
                  Annuleren
                </Button>
                <Button variant="contained" type="submit">
                  Opslaan
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </form>
  );
};

export default WorklogForm; 