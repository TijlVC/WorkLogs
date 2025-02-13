import { useState, useEffect } from 'react';
import { 
  Box,
  Card,
  CardContent,
  IconButton,
  Button,
  Typography,
  Collapse,
  Stack,
  Checkbox
} from '@mui/material';
import { Edit, Delete, ExpandMore as ExpandMoreIcon, FileDownload } from '@mui/icons-material';
import { format, getISOWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { styled } from '@mui/material/styles';
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx';
import { saveAs } from 'file-saver';

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
  plannedTasks: Array<{
    task: string;
    completed: boolean;
    timeSpent: number;
  }>;
  administrativeTasks: Array<{
    task: string;
    completed: boolean;
    timeSpent: number;
  }>;
}

const encodeCell = (r: number, c: number) => {
  const colRef = String.fromCharCode(65 + c);
  return `${colRef}${r + 1}`;
};

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
          plannedTasks: data.plannedTasks?.map((task: any) => {
            // Als task een string is, converteer naar object
            if (typeof task === 'string') {
              return {
                task: task,
                completed: false,
                timeSpent: 0
              };
            }
            // Als task een object is
            return {
              task: task.task || '',
              completed: task.completed || false,
              timeSpent: task.timeSpent || 0
            };
          }) || [],
          administrativeTasks: data.administrativeTasks?.map((task: any) => {
            // Als task een string is, converteer naar object
            if (typeof task === 'string') {
              return {
                task: task,
                completed: false,
                timeSpent: 0
              };
            }
            // Als task een object is
            return {
              task: task.task || '',
              completed: task.completed || false,
              timeSpent: task.timeSpent || 0
            };
          }) || []
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

  const exportToExcel = (worklog: Worklog) => {
    // Bereid de data voor
    const worklogData = [
      ['Werklog Registratie', '', ''],
      ['', '', ''],
      ['Datum:', format(new Date(worklog.date), 'dd-MM-yyyy'), ''],
      ['Week:', getISOWeek(new Date(worklog.date)), ''],
      ['Totaal Uren:', worklog.hours, ''],
      ['Project:', worklog.projectTitle, ''],
      ['Fase:', worklog.phase, ''],
      ['', '', ''],
      ['Geplande Taken / Doelen', '', ''],
      ['Taak', 'Status', 'Gewerkte Tijd'],
      ...worklog.plannedTasks.map(task => [
        task.task,
        task.completed ? '✓' : '',
        task.timeSpent > 0 ? `${task.timeSpent} uur` : ''
      ]),
      ['', '', ''],
      ['Administratieve / Overige Taken', '', ''],
      ['Taak', 'Status', 'Gewerkte Tijd'],
      ...worklog.administrativeTasks.map(task => [
        task.task,
        task.completed ? '✓' : '',
        task.timeSpent > 0 ? `${task.timeSpent} uur` : ''
      ])
    ];

    // Maak een worksheet
    const ws = xlsxUtils.aoa_to_sheet(worklogData);

    // Kolom breedtes
    ws['!cols'] = [
      { wch: 60 }, // Taak kolom breder
      { wch: 12 }, // Status kolom
      { wch: 15 }  // Tijd kolom
    ];

    // Styling voor cellen
    const headerStyle = {
      fill: { fgColor: { rgb: "E7E6E6" }, patternType: "solid" }, // Lichtgrijs zoals in je app
      font: { bold: true, sz: 11 },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    // Pas styling toe op alle cellen
    worklogData.forEach((row, rowIndex) => {
      row.forEach((_, colIndex) => {
        const cellRef = encodeCell(rowIndex, colIndex);
        if (!ws[cellRef]) return;

        // Basis cell styling
        ws[cellRef].s = {
          font: { sz: 11 },
          alignment: { vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };

        // Headers
        if (rowIndex === 8 || rowIndex === 12) {
          ws[cellRef].s = headerStyle;
        }

        // Titel en info velden
        if (rowIndex <= 7 && colIndex === 0) {
          ws[cellRef].s = { font: { bold: true, sz: 11 } };
        }

        // Status kolom centreren
        if (colIndex === 1 && rowIndex > 9) {
          ws[cellRef].s.alignment.horizontal = "center";
        }
      });
    });

    // Merge cellen voor headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 8, c: 0 }, e: { r: 8, c: 2 } },
      { s: { r: 12, c: 0 }, e: { r: 12, c: 2 } }
    ];

    // Maak een workbook
    const wb = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(wb, ws, 'Werklog');

    // Genereer Excel bestand
    const excelBuffer = xlsxWrite(wb, { 
      bookType: 'xlsx', 
      type: 'array',
      bookSST: false,
      compression: true
    });

    const fileName = `Worklog ${format(new Date(worklog.date), 'dd-MM-yyyy')} - ${user?.name || 'Gast'}`;
    const data = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    saveAs(data, `${fileName}.xlsx`);
  };

  const exportAllWorklogs = () => {
    // Maak een nieuw workbook
    const wb = xlsxUtils.book_new();
    
    // Sorteer worklogs op datum
    const sortedWorklogs = [...worklogs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Alle data verzamelen in één array
    const allWorklogsData = [
      ['Werklog Overzicht', '', ''],
      ['', '', ''],
    ];

    sortedWorklogs.forEach((worklog, index) => {
      // Voeg scheidingslijn toe als het niet de eerste worklog is
      if (index > 0) {
        allWorklogsData.push(['', '', ''], ['', '', '']);
      }

      // Voeg worklog data toe
      allWorklogsData.push(
        ['Datum:', format(new Date(worklog.date), 'dd-MM-yyyy'), ''],
        ['Week:', getISOWeek(new Date(worklog.date)), ''],
        ['Totaal Uren:', worklog.hours, ''],
        ['Project:', worklog.projectTitle, ''],
        ['Fase:', worklog.phase, ''],
        ['', '', ''],
        ['Geplande Taken / Doelen', '', ''],
        ['Taak', 'Status', 'Gewerkte Tijd'],
        ...worklog.plannedTasks.map(task => [
          task.task,
          task.completed ? '✓' : '',
          task.timeSpent > 0 ? `${task.timeSpent} uur` : ''
        ]),
        ['', '', ''],
        ['Administratieve / Overige Taken', '', ''],
        ['Taak', 'Status', 'Gewerkte Tijd'],
        ...worklog.administrativeTasks.map(task => [
          task.task,
          task.completed ? '✓' : '',
          task.timeSpent > 0 ? `${task.timeSpent} uur` : ''
        ])
      );
    });

    // Maak een worksheet
    const ws = xlsxUtils.aoa_to_sheet(allWorklogsData);

    // Kolom breedtes
    ws['!cols'] = [
      { wch: 60 }, // Taak kolom
      { wch: 12 }, // Status kolom
      { wch: 15 }  // Tijd kolom
    ];

    // Pas dezelfde styling toe als bij enkele worklog
    allWorklogsData.forEach((row, rowIndex) => {
      row.forEach((_, colIndex) => {
        const cellRef = encodeCell(rowIndex, colIndex);
        if (!ws[cellRef]) return;

        // Basis cell styling
        ws[cellRef].s = {
          font: { sz: 11 },
          alignment: { vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };

        // Headers styling
        if (row[0] === 'Geplande Taken / Doelen' || row[0] === 'Administratieve / Overige Taken') {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: "E7E6E6" }, patternType: "solid" },
            font: { bold: true, sz: 11 },
            alignment: { horizontal: "left", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }

        // Info velden bold maken
        if (['Datum:', 'Week:', 'Totaal Uren:', 'Project:', 'Fase:'].includes(row[0])) {
          ws[cellRef].s.font = { bold: true, sz: 11 };
        }

        // Status kolom centreren
        if (colIndex === 1 && row[0] !== '') {
          ws[cellRef].s.alignment.horizontal = "center";
        }
      });
    });

    // Voeg worksheet toe aan workbook
    xlsxUtils.book_append_sheet(wb, ws, 'Alle Worklogs');

    // Genereer Excel bestand
    const excelBuffer = xlsxWrite(wb, { 
      bookType: 'xlsx', 
      type: 'array',
      bookSST: false,
      compression: true
    });

    const fileName = `Worklog Overzicht ${format(new Date(), 'dd-MM-yyyy')} - ${user?.name || 'Gast'}`;
    const data = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    saveAs(data, `${fileName}.xlsx`);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1200px', margin: '0 auto', px: { xs: 1, sm: 2 } }}>
      {/* Bestaande knoppen */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
        {isAuthenticated && (
          <Button 
            variant="contained" 
            onClick={() => navigate('/worklog/new')}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Nieuwe Registratie
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={exportAllWorklogs}
          startIcon={<FileDownload />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Download Alle Worklogs
        </Button>
      </Box>
      
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
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToExcel(worklog);
                    }}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    <FileDownload />
                  </IconButton>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">
                    {worklog.projectTitle}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    {worklog.phase}
                  </Typography>
                </Box>

                <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                  Geplande Taken / Doelen
                </Typography>
                <Box mb={3} sx={{ pl: 4 }}>
                  {worklog.plannedTasks.map((task, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Checkbox checked={task.completed} disabled />
                      <Typography variant="body1">
                        {task.task}
                      </Typography>
                      {task.timeSpent > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                          ({task.timeSpent} uur)
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>

                <Typography variant="h6" bgcolor="grey.100" p={1} mb={2}>
                  Administratieve / Overige Taken
                </Typography>
                <Box mb={3} sx={{ pl: 4 }}>
                  {worklog.administrativeTasks.map((task, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Checkbox checked={task.completed} disabled />
                      <Typography variant="body1">
                        {task.task}
                      </Typography>
                      {task.timeSpent > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                          ({task.timeSpent} uur)
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>

                {isAuthenticated && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <IconButton onClick={() => exportToExcel(worklog)}>
                      <FileDownload />
                    </IconButton>
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
  );
};

export default WorklogList; 