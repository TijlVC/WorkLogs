import { useState, useEffect } from 'react';
import { 
  Box,
  Card,
  CardContent,
  IconButton,
  Button,
  Typography,
  Collapse,
  Stack
} from '@mui/material';
import { Edit, Delete, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { format, getISOWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { styled } from '@mui/material/styles';
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Styled component voor de expand knop met rotatie
const ExpandMore = styled((props: {
  expand: boolean;
  onClick: () => void;
}) => {
  const { expand, ...other } = props;
  return <IconButton {...other}><ExpandMoreIcon /></IconButton>;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

interface Worklog {
  id: string;
  date: string;
  userId: string;
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

const WorklogList = () => {
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    fetchWorklogs();
  }, []);

  const fetchWorklogs = async () => {
    try {
      const worklogsRef = collection(db, 'worklogs');
      const q = query(worklogsRef, orderBy('date', 'desc'));

      const querySnapshot = await getDocs(q);
      const worklogData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date || '',
          userId: data.userId || '',
          hours: data.hours || 0,
          projectTitle: data.projectTitle || 'Project Netwerkvernieuwing GBS Tilia',
          phase: data.phase || '',
          plannedTasks: data.plannedTasks || [],
          completedTasks: data.completedTasks || [],
          administrativeTasks: data.administrativeTasks || [],
          other: data.other || []
        };
      }) as Worklog[];

      setWorklogs(worklogData);
    } catch (error) {
      console.error('Error fetching worklogs:', error);
      setWorklogs([]);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const worklogRef = doc(db, 'worklogs', id);
      const worklogSnap = await getDoc(worklogRef);
      const worklogData = worklogSnap.data();
      
      console.log('Delete attempt:', {
        worklogId: id,
        worklogData,
        userId: worklogData?.userId,
        currentUser: user?.id,
        isMatch: worklogData?.userId === user?.id
      });

      if (worklogData?.userId !== user?.id) {
        console.error('Cannot delete: User ID mismatch');
        return;
      }

      await deleteDoc(worklogRef);
      await fetchWorklogs();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleExpandClick = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      {/* Container met meer ruimte */}
      <Box sx={{ 
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        px: { xs: 1, sm: 2 }, // Padding voor verschillende schermgroottes
      }}>
        {/* Nieuwe registratie knop */}
        {isAuthenticated && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => navigate('/worklog/new')}
              sx={{ width: { xs: '100%', sm: 'auto' } }} // Volledige breedte op mobiel
            >
              Nieuwe Registratie
            </Button>
          </Box>
        )}
        
        {/* Worklog cards */}
        <Stack spacing={2}>
          {worklogs.map((worklog) => (
            <Card key={worklog.id}>
              <CardContent sx={{ 
                pb: 0, 
                px: { xs: 2, sm: 4 }, // Minder padding op mobiel
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' }, // Stapelen op mobiel
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: { xs: 1, sm: 2 }
                }}>
                  {/* Week nummer */}
                  <Typography 
                    variant="subtitle1" 
                    color="text.secondary"
                    sx={{ 
                      minWidth: { xs: '100%', sm: '100px' },
                      order: { xs: 2, sm: 1 }
                    }}
                  >
                    Week: {getISOWeek(new Date(worklog.date))}
                  </Typography>

                  {/* Datum */}
                  <Typography 
                    variant="h6" 
                    component="div" 
                    sx={{ 
                      flexGrow: 1,
                      order: { xs: 1, sm: 2 }
                    }}
                  >
                    {format(new Date(worklog.date), 'EE dd/MM/yy', { locale: nl }).toUpperCase()}
                  </Typography>

                  {/* Uren en expand knop */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    width: { xs: '100%', sm: 'auto' },
                    justifyContent: { xs: 'space-between', sm: 'flex-end' },
                    order: { xs: 3, sm: 3 }
                  }}>
                    <Typography variant="subtitle1" color="text.secondary">
                      {worklog.hours} uren
                    </Typography>
                    <ExpandMore
                      expand={expandedId === worklog.id}
                      onClick={() => handleExpandClick(worklog.id)}
                      aria-expanded={expandedId === worklog.id}
                      aria-label="toon details"
                    />
                  </Box>
                </Box>
              </CardContent>

              {/* Content in uitgeklapte staat */}
              <Collapse in={expandedId === worklog.id} timeout="auto" unmountOnExit>
                <CardContent sx={{ px: 4, py: 3 }}>
                  {/* Project Titel */}
                  <Typography variant="h6" bgcolor="grey.100" p={1} mb={2} textAlign="center">
                    {worklog.projectTitle}
                  </Typography>

                  {/* Fase */}
                  <Box mb={3} sx={{ pl: 4 }}>
                    <Typography variant="body1">
                      Fase: {worklog.phase}
                    </Typography>
                  </Box>

                  {/* Geplande Taken / Doelen */}
                  <Typography variant="h6" bgcolor="grey.100" p={1} mb={2} textAlign="center">
                    Geplande Taken / Doelen
                  </Typography>
                  <Box mb={3} sx={{ pl: 4 }}>
                    {worklog.plannedTasks.map((task, index) => (
                      <Typography key={index} variant="body1" sx={{ mb: 1 }}>
                        - {task}
                      </Typography>
                    ))}
                  </Box>

                  {/* Afgewerkte Taken / Doelen */}
                  <Typography variant="h6" bgcolor="grey.100" p={1} mb={2} textAlign="center">
                    Afgewerkte Taken / Doelen
                  </Typography>
                  <Box mb={3} sx={{ pl: 4 }}>
                    {worklog.completedTasks.map((task, index) => (
                      <Typography key={index} variant="body1" sx={{ mb: 1 }}>
                        - {task}
                      </Typography>
                    ))}
                  </Box>

                  {/* Administratieve Taken */}
                  <Typography variant="h6" bgcolor="grey.100" p={1} mb={2} textAlign="center">
                    Administratieve Taken
                  </Typography>
                  <Box mb={3} sx={{ pl: 4 }}>
                    {worklog.administrativeTasks.map((task, index) => (
                      <Typography key={index} variant="body1" sx={{ mb: 1 }}>
                        - {task}
                      </Typography>
                    ))}
                  </Box>

                  {/* Overige */}
                  <Typography variant="h6" bgcolor="grey.100" p={1} mb={2} textAlign="center">
                    Overige
                  </Typography>
                  <Box mb={3} sx={{ pl: 4 }}>
                    {worklog.other.map((item, index) => (
                      <Box key={index} mb={1} display="flex" justifyContent="space-between">
                        <Typography variant="body1" sx={{ minWidth: '150px' }}>
                          {item.task}:
                        </Typography>
                        <Typography variant="body1" sx={{ width: '75%', textAlign: 'left' }}>
                          {item.description}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {isAuthenticated && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <IconButton onClick={() => navigate(`/worklog/edit/${worklog.id}`)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(worklog.id)}>
                        <Delete />
                      </IconButton>
                    </Box>
                  )}
                </CardContent>
              </Collapse>
            </Card>
          ))}
        </Stack>
      </Box>
    </>
  );
};

export default WorklogList; 