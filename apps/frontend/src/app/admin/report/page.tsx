'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink }  from '@react-pdf/renderer';

interface IUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface ILog {
  id: number;
  userId: number;
  roomId: number;
  message: string;
  eventType: string;
  timestamp: number;
}

interface ReportProps {
  user: IUser | undefined;
  logs: ILog[];
  startTime: string;
  endTime: string;
}

function MyDocument({ user, logs, startTime, endTime }: ReportProps) {
  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 11,
      padding: 30,
      flexDirection: 'column',
      backgroundColor: '#FFFFFF'
    },
    header: {
      fontSize: 24,
      marginBottom: 20,
      textAlign: 'center',
      color: '#333333',
      fontFamily: 'Helvetica-Bold',
    },
    section: {
      marginBottom: 15,
      padding: 10,
      border: '1px solid #E4E4E4',
      borderRadius: 5,
    },
    sectionTitle: {
      fontSize: 14,
      marginBottom: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#4A4A4A'
    },
    text: {
      marginBottom: 4,
      fontSize: 11,
    },
    logTable: {
      display: "flex",
      width: "auto",
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: '#E4E4E4',
      borderRightWidth: 0,
      borderBottomWidth: 0
    },
    logTableHeader: {
      backgroundColor: '#F2F2F2',
      flexDirection: 'row',
      borderBottomColor: '#E4E4E4',
      borderBottomWidth: 1,
      alignItems: 'center',
      height: 24,
      textAlign: 'center',
      fontFamily: 'Helvetica-Bold',
    },
    logTableRow: {
      flexDirection: 'row',
      borderBottomColor: '#E4E4E4',
      borderBottomWidth: 1,
      alignItems: 'center',
      minHeight: 24,
    },
    colTimestamp: {
      width: '20%',
      borderRightColor: '#E4E4E4',
      borderRightWidth: 1,
      padding: 5,
    },
    colEvent: {
      width: '30%',
      borderRightColor: '#E4E4E4',
      borderRightWidth: 1,
      padding: 5,
    },
    colMessage: {
      width: '50%',
      padding: 5,
    }
  });

  const formatTimestamp = (totalSeconds: number) => {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) {
      return '00:00:00';
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const pad = (num: number) => num.toString().padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Proctoring Session Report</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Details</Text>
          <Text style={styles.text}>
            User: {user ? `${user.firstName} ${user.lastName}` : 'N/A'}
          </Text>
          <Text style={styles.text}>
            Email: {user ? user.email : 'N/A'}
          </Text>
          <Text style={styles.text}>
            Start Time: {startTime ? new Date(startTime).toLocaleString() : 'N/A'}
          </Text>
          <Text style={styles.text}>
            End Time: {endTime ? new Date(endTime).toLocaleString() : 'N/A'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Logs</Text>
          <View style={styles.logTable}>
            <View style={styles.logTableHeader}>
              <Text style={styles.colTimestamp}>Timestamp</Text>
              <Text style={styles.colEvent}>Event Type</Text>
              <Text style={styles.colMessage}>Message</Text>
            </View>
            
            {logs && logs.map((log, index) => (
              <View key={index} style={styles.logTableRow} wrap={false}>
                <Text style={styles.colTimestamp}>{formatTimestamp(log.timestamp)}</Text>
                <Text style={styles.colEvent}>{log.eventType}</Text>
                <Text style={styles.colMessage}>{log.message}</Text>
              </View>
            ))}
            
            {(!logs || logs.length === 0) && (
               <View style={styles.logTableRow}>
                 <Text style={{padding: 5}}>No activity logs recorded for this session.</Text>
               </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default function Report() {

  const searchParams = useSearchParams();
  const initalizeRef = useRef(false);

  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [candidate, setCandidate] = useState<IUser>();
  const [logs, setLogs] = useState<ILog[]>([]);
  const [focusLostCount, setFocusLostCount] = useState<number>(0);
  const [suspiciousEventCount, setSuspiciousEventCount] = useState<number>(0);

  async function fetchLogs(){
    const roomId = searchParams.get('roomId');
    const candidateId = searchParams.get('candidateId');

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/room/logs?roomId=${roomId}${candidateId? '&candidateId=' + candidateId : ''}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('admin-token')}`
          }
        }
      )

      console.log(response);
      setCandidate(response.data.data.candidate);
      setLogs(response.data.data.logs);
      let flc = 0, sec = 0;
      response.data.data.logs.map((log: ILog) => {
        if(log.eventType === 'candidate_not_focused'){
          flc++;
        }
        else{
          sec++;
        }
      });
      setFocusLostCount(flc);
      setSuspiciousEventCount(sec);
      setStartTime(response.data.data.startTime);
      setEndTime(response.data.data.endTime);
    } catch (error) {
      console.log(error);
    }
    finally {
      setIsLoading(false);
    }
  }
  
  useEffect(() => {
    if(!initalizeRef.current){
      initalizeRef.current = true;
      fetchLogs();
    }
  },[]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  function calculateDuration(startTime: string, endTime: string) {
    // Return an empty string if times are not valid
    if (!startTime || !endTime) {
      return '0min';
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Calculate the difference in milliseconds
    let diffMs = end - start;

    // Handle cases where the difference is negative or invalid
    if (isNaN(diffMs) || diffMs < 0) {
      return '0min';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    diffMs -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diffMs / (1000 * 60));

    let durationString = '';
    if (hours > 0) {
      durationString += `${hours}hr `;
    }
    durationString += `${minutes}min`;

    return durationString;
  }

  return (
    <main>
      <section  className='w-full h-[calc(100vh-53px)] bg-gray-100'>
        <div className='p-5 md:p-10 container bg-white'>
          <div className='pb-5 w-full flex flex-col md:flex-row gap-2'>
            <div className='flex-1 p-5'>
              <p className='mb-2 text-2xl font-semibold'>Recording</p>
              <div className='aspect-video bg-gray-100'>
                <video 
                  className={`w-full aspect-video object-cover transform -scale-x-100`}
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            </div>
            <div className='min-w-sm p-5'>
              <p className='mb-2 text-2xl font-semibold'>Proctoring Report</p>
              <div className='p-2 border'>
                <div className='mb-2 pb-2 border-b'>
                  <div>
                    <span className='font-semibold'>Candidate Name: </span>
                    <span className='capitalize'>{`${candidate?.firstName} ${candidate?.lastName}`}</span>
                  </div>
                  <div>
                    <span className='font-semibold'>Interview Duration: </span>
                    <span>{calculateDuration(startTime, endTime)}</span>
                  </div>
                </div>
                <div className='mb-2 pb-2 border-b'>
                  <div>
                    <span className='font-semibold'>Focus lost: </span>
                    <span>{focusLostCount}</span>
                  </div>
                  <div>
                    <span className='font-semibold'>Suspicious Event: </span>
                    <span>{suspiciousEventCount}</span>
                  </div>
                </div>
                <div>
                  <span className='font-semibold'>Final Integrity Score: </span>
                  <span>{100 - focusLostCount - suspiciousEventCount}</span>
                </div>
              </div>
              <div className='pt-5 flex justify-center'>
                {isClient && !isLoading && (
                  <PDFDownloadLink 
                    document={
                      <MyDocument
                        user={candidate}
                        logs={logs}
                        startTime={startTime}
                        endTime={endTime}
                      />
                    }
                    fileName="report.pdf"
                  >
                    {({ loading }) =>
                      <button className='px-2 py-1 bg-black text-white font-bold rounded'>
                        {loading ? 'Loading' : 'Download Report'} 
                      </button>
                    }
                  </PDFDownloadLink>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
