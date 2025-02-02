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

interface WorklogFormData {
  date: Date;
  hours: number;
  helpdeskSupport: {
    incidents: Array<{
      number: string;
      description: string;
    }>;
  };
  projects: Array<{
    number: string;
    description: string;
  }>;
  administration: {
    meetings: Array<{
      title: string;
      notes: Array<string>;
    }>;
  };
  other: Array<{
    task: string;
    description: string;
  }>;
}

const emptyWorklog: WorklogFormData = {
  date: new Date(),
  hours: 8,
  helpdeskSupport: {
    incidents: []
  },
  projects: [],
  administration: {
    meetings: [{
      title: '',
      notes: ['']
    }]
  },
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
        helpdeskSupport: {
          incidents: data.helpdeskSupport?.incidents || []
        },
        projects: data.projects || [],
        administration: {
          meetings: data.administration?.meetings || [{
            title: '',
            notes: ['']
          }]
        },
        other: data.other || []
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
      helpdeskSupport: formData.helpdeskSupport,
      projects: formData.projects,
      administration: formData.administration,
      other: formData.other,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending' as const
    };

    try {
      // Sla eerst lokaal op
      const localId = await indexedDB.worklogs.add(worklogData);

      try {
        // Probeer naar Firebase te syncen
        if (id) {
          await updateDoc(doc(db, 'worklogs', id), worklogData);
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
  const addIncident = () => {
    setFormData({
      ...formData,
      helpdeskSupport: {
        incidents: [...formData.helpdeskSupport.incidents, { number: '', description: '' }]
      }
    });
  };

  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, { number: '', description: '' }]
    });
  };

  const addMeetingNote = (meetingIndex: number) => {
    const newMeetings = [...formData.administration.meetings];
    newMeetings[meetingIndex].notes.push('');
    setFormData({
      ...formData,
      administration: { meetings: newMeetings }
    });
  };

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

            {/* Helpdesk Ondersteuning */}
            <Grid item xs={12}>
              <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                Helpdesk Ondersteuning
              </Typography>
              <List>
                {formData.helpdeskSupport.incidents.map((incident, index) => (
                  <ListItem key={index}>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          label="Incident nummer"
                          value={incident.number}
                          onChange={(e) => {
                            const newIncidents = [...formData.helpdeskSupport.incidents];
                            newIncidents[index].number = e.target.value;
                            setFormData({
                              ...formData,
                              helpdeskSupport: { incidents: newIncidents }
                            });
                          }}
                        />
                      </Grid>
                      <Grid item xs={8}>
                        <TextField
                          fullWidth
                          label="Omschrijving"
                          value={incident.description}
                          onChange={(e) => {
                            const newIncidents = [...formData.helpdeskSupport.incidents];
                            newIncidents[index].description = e.target.value;
                            setFormData({
                              ...formData,
                              helpdeskSupport: { incidents: newIncidents }
                            });
                          }}
                        />
                      </Grid>
                      <Grid item xs={1}>
                        <IconButton
                          onClick={() => {
                            const newIncidents = formData.helpdeskSupport.incidents.filter((_, i) => i !== index);
                            setFormData({
                              ...formData,
                              helpdeskSupport: { incidents: newIncidents }
                            });
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
                onClick={addIncident}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Incident toevoegen
              </Button>
            </Grid>

            {/* Projecten */}
            <Grid item xs={12}>
              <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                Projecten
              </Typography>
              <List>
                {formData.projects.map((project, index) => (
                  <ListItem key={index}>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          label="Project nummer"
                          value={project.number}
                          onChange={(e) => {
                            const newProjects = [...formData.projects];
                            newProjects[index].number = e.target.value;
                            setFormData({ ...formData, projects: newProjects });
                          }}
                        />
                      </Grid>
                      <Grid item xs={8}>
                        <TextField
                          fullWidth
                          label="Omschrijving"
                          value={project.description}
                          onChange={(e) => {
                            const newProjects = [...formData.projects];
                            newProjects[index].description = e.target.value;
                            setFormData({ ...formData, projects: newProjects });
                          }}
                        />
                      </Grid>
                      <Grid item xs={1}>
                        <IconButton
                          onClick={() => {
                            const newProjects = formData.projects.filter((_, i) => i !== index);
                            setFormData({ ...formData, projects: newProjects });
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
                onClick={addProject}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Project toevoegen
              </Button>
            </Grid>

            {/* Administratie */}
            <Grid item xs={12}>
              <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                Administratie
              </Typography>
              {formData.administration.meetings.map((meeting, meetingIndex) => (
                <Box key={meetingIndex} mb={3}>
                  <TextField
                    fullWidth
                    label="Titel"
                    value={meeting.title}
                    onChange={(e) => {
                      const newMeetings = [...formData.administration.meetings];
                      newMeetings[meetingIndex].title = e.target.value;
                      setFormData({
                        ...formData,
                        administration: { meetings: newMeetings }
                      });
                    }}
                    sx={{ mb: 2 }}
                  />
                  <List>
                    {meeting.notes.map((note, noteIndex) => (
                      <ListItem key={noteIndex}>
                        <TextField
                          fullWidth
                          label={`Notitie ${noteIndex + 1}`}
                          value={note}
                          onChange={(e) => {
                            const newMeetings = [...formData.administration.meetings];
                            newMeetings[meetingIndex].notes[noteIndex] = e.target.value;
                            setFormData({
                              ...formData,
                              administration: { meetings: newMeetings }
                            });
                          }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            onClick={() => {
                              const newMeetings = [...formData.administration.meetings];
                              newMeetings[meetingIndex].notes = meeting.notes.filter((_, i) => i !== noteIndex);
                              setFormData({
                                ...formData,
                                administration: { meetings: newMeetings }
                              });
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
                    onClick={() => addMeetingNote(meetingIndex)}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    Notitie toevoegen
                  </Button>
                </Box>
              ))}
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