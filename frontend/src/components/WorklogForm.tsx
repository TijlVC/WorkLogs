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

interface Task {
  task: string;
  completed: boolean;
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
  hours: 8,
  projectTitle: 'Project Netwerkvernieuwing GBS Tilia',
  phase: '',
  plannedTasks: [],
  administrativeTasks: []
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
      [type]: [...formData[type], { task: '', completed: false }]
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
                  onChange={(e) => setFormData({ ...formData, hours: Number(e.target.value) })}
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
              <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                Geplande Taken / Doelen
              </Typography>
              <List>
                {formData.plannedTasks.map((task, index) => (
                  <ListItem key={index}>
                    <Checkbox
                      checked={task.completed}
                      onChange={() => toggleTaskCompletion('plannedTasks', index)}
                    />
                    <TextField
                      fullWidth
                      multiline
                      value={task.task}
                      onChange={(e) => handleTaskChange('plannedTasks', index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault();
                          const newValue = task.task + '\n';
                          handleTaskChange('plannedTasks', index, newValue);
                        }
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => removeTask('plannedTasks', index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
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
              <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                Administratieve / Overige Taken
              </Typography>
              <List>
                {formData.administrativeTasks.map((task, index) => (
                  <ListItem key={index}>
                    <Checkbox
                      checked={task.completed}
                      onChange={() => toggleTaskCompletion('administrativeTasks', index)}
                    />
                    <TextField
                      fullWidth
                      multiline
                      value={task.task}
                      onChange={(e) => handleTaskChange('administrativeTasks', index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault();
                          const newValue = task.task + '\n';
                          handleTaskChange('administrativeTasks', index, newValue);
                        }
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => removeTask('administrativeTasks', index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
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