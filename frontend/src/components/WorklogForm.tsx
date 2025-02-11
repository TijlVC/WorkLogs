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
  ListItemSecondaryAction
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
import { IWorklog } from '../utils/db';

interface WorklogFormData {
  date: Date;
  hours: number;
  projectTitle: string;
  phase: string;
  plannedTasks: Array<string>;
  completedTasks: Array<string>;
  administrativeTasks: Array<string>;
  other: Array<{
    task: string;
    description: string;
  }>;
}

const emptyWorklog: WorklogFormData = {
  date: new Date(),
  hours: 8,
  projectTitle: 'Project Netwerkvernieuwing GBS Tilia',
  phase: '',
  plannedTasks: [''],
  completedTasks: [''],
  administrativeTasks: [''],
  other: []
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
        plannedTasks: data.plannedTasks || [''],
        completedTasks: data.completedTasks || [''],
        administrativeTasks: data.administrativeTasks || [''],
        other: data.other || []
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const worklogData: IWorklog = {
      userId: user.id,
      date: format(formData.date, 'yyyy-MM-dd'),
      hours: formData.hours,
      projectTitle: formData.projectTitle,
      phase: formData.phase,
      plannedTasks: formData.plannedTasks,
      completedTasks: formData.completedTasks,
      administrativeTasks: formData.administrativeTasks,
      other: formData.other,
      syncStatus: 'pending'
    };

    try {
      // Sla eerst lokaal op
      const localId = await indexedDB.worklogs.add(worklogData);

      try {
        // Probeer naar Firebase te syncen
        if (id) {
          await updateDoc(doc(db, 'worklogs', id), worklogData as { [key: string]: any });
        } else {
          const newWorklogRef = doc(collection(db, 'worklogs'));
          await setDoc(newWorklogRef, {
            ...worklogData,
            createdAt: new Date().toISOString()
          });
        }

        // Update sync status
        await indexedDB.worklogs.update(localId, { syncStatus: 'synced' });
      } catch (error) {
        console.error('Sync error:', error);
        // Laat in IndexedDB met 'pending' status voor latere sync
      }

      navigate('/');
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // Helper functions voor het toevoegen/verwijderen van items
  const addOtherTask = () => {
    setFormData({
      ...formData,
      other: [...formData.other, { task: '', description: '' }]
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Paper elevation={3}>
        <Box p={3}>
          <Grid container spacing={3}>
            {/* Header */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
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

            {/* Project Titel */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Project Titel"
                value={formData.projectTitle}
                onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
              />
            </Grid>

            {/* Fase */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Fase"
                value={formData.phase}
                onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="">Selecteer een fase</option>
                <option value="Fase Voorbereiding">Fase Voorbereiding</option>
                <option value="Fase 1 - Tijdelijke netwerk">Fase 1 - Tijdelijke netwerk</option>
                <option value="Fase 2 - Bekabelingswerken">Fase 2 - Bekabelingswerken</option>
                <option value="Fase 3 - Uitrol netwerk">Fase 3 - Uitrol netwerk</option>
              </TextField>
            </Grid>

            {/* Geplande Taken / Doelen */}
            <Grid item xs={12}>
              <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                Geplande Taken / Doelen
              </Typography>
              <List>
                {formData.plannedTasks.map((task, index) => (
                  <ListItem key={index}>
                    <TextField
                      fullWidth
                      label={`Taak ${index + 1}`}
                      value={task}
                      onChange={(e) => {
                        const newTasks = [...formData.plannedTasks];
                        newTasks[index] = e.target.value;
                        setFormData({ ...formData, plannedTasks: newTasks });
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        onClick={() => {
                          const newTasks = formData.plannedTasks.filter((_, i) => i !== index);
                          setFormData({ ...formData, plannedTasks: newTasks });
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setFormData({ ...formData, plannedTasks: [...formData.plannedTasks, ''] })}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Taak toevoegen
              </Button>
            </Grid>

            {/* Afgewerkte Taken / Doelen */}
            <Grid item xs={12}>
              <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                Afgewerkte Taken / Doelen
              </Typography>
              <List>
                {formData.completedTasks.map((task, index) => (
                  <ListItem key={index}>
                    <TextField
                      fullWidth
                      label={`Taak ${index + 1}`}
                      value={task}
                      onChange={(e) => {
                        const newTasks = [...formData.completedTasks];
                        newTasks[index] = e.target.value;
                        setFormData({ ...formData, completedTasks: newTasks });
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        onClick={() => {
                          const newTasks = formData.completedTasks.filter((_, i) => i !== index);
                          setFormData({ ...formData, completedTasks: newTasks });
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setFormData({ ...formData, completedTasks: [...formData.completedTasks, ''] })}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Taak toevoegen
              </Button>
            </Grid>

            {/* Administratieve Taken */}
            <Grid item xs={12}>
              <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                Administratieve Taken
              </Typography>
              <List>
                {formData.administrativeTasks.map((task, index) => (
                  <ListItem key={index}>
                    <TextField
                      fullWidth
                      label={`Taak ${index + 1}`}
                      value={task}
                      onChange={(e) => {
                        const newTasks = [...formData.administrativeTasks];
                        newTasks[index] = e.target.value;
                        setFormData({ ...formData, administrativeTasks: newTasks });
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        onClick={() => {
                          const newTasks = formData.administrativeTasks.filter((_, i) => i !== index);
                          setFormData({ ...formData, administrativeTasks: newTasks });
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setFormData({ ...formData, administrativeTasks: [...formData.administrativeTasks, ''] })}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Taak toevoegen
              </Button>
            </Grid>

            {/* Overige */}
            <Grid item xs={12}>
              <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                Overige
              </Typography>
              <List>
                {formData.other.map((item, index) => (
                  <ListItem key={index}>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          label="Taak"
                          value={item.task}
                          onChange={(e) => {
                            const newOther = [...formData.other];
                            newOther[index].task = e.target.value;
                            setFormData({ ...formData, other: newOther });
                          }}
                        />
                      </Grid>
                      <Grid item xs={8}>
                        <TextField
                          fullWidth
                          label="Omschrijving"
                          value={item.description}
                          onChange={(e) => {
                            const newOther = [...formData.other];
                            newOther[index].description = e.target.value;
                            setFormData({ ...formData, other: newOther });
                          }}
                        />
                      </Grid>
                      <Grid item xs={1}>
                        <IconButton
                          onClick={() => {
                            const newOther = formData.other.filter((_, i) => i !== index);
                            setFormData({ ...formData, other: newOther });
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </ListItem>
                ))}
              </List>
              <Button
                startIcon={<AddIcon />}
                onClick={addOtherTask}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Taak toevoegen
              </Button>
            </Grid>

            {/* Actions */}
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