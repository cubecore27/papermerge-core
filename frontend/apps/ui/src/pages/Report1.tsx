// React
import { useEffect, useState } from 'react';

// styles
import styles from './report.module.css';

// Lucide Icons
import {
  Upload,
  Download,
  Trash2,
  HardDrive,
  FileText,
  FileSpreadsheet,
  FileImage,
  FilePlus
} from 'lucide-react';

// Redux & API
import { useGetPaginatedNodesQuery } from '@/features/nodes/apiSlice';
import { useAppSelector } from '@/app/hooks';
import { selectCurrentUser } from '@/slices/currentUser';
import DoughnutChart from '@/components/Charts/Doughnut';


export default function Report() {
  // current user
  const currentUser = useAppSelector(selectCurrentUser);

  // Fetch the data
  const {
    data: homeNodeData,
    isLoading,
    error
  } = useGetPaginatedNodesQuery(
    {
      nodeID: currentUser?.home_folder_id || '',
      page_number: 1,
      page_size: 1000,
      sortDir: 'az',
      sortColumn: 'title'
    },
    {
      skip: !currentUser?.home_folder_id
    }
  );

  // === NEW: Fetch KPI Summary from API ===
  const [summaryData, setSummaryData] = useState<{
    total_uploads: number;
    total_downloads: number;
    total_deletions: number;
  } | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setSummaryLoading(true);

        // Automatically fetch the token from cookies
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };

        const token = getCookie('access_token'); // Replace 'authToken' with the actual cookie name used in your app

        if (!token) {
          throw new Error('No authentication token found in cookies');
        }

        const res = await fetch('http://127.0.0.1:8000/api/stats/summary/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) throw new Error('Failed to fetch summary data');
        const data = await res.json();
        setSummaryData(data);
      } catch (err) {
        console.error('Error fetching summary:', err);
        setSummaryError(true);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummary();
  }, []);

  console.log('Summary state:', summaryData);

  // Fetch All Documents
  const docs = homeNodeData?.items || [];
  const documentRows = docs.map(file => ({
    timestamp: 'N/A', // No date info available
    user: file.user_id ? `User: ${file.user_id}` : 'Unknown',
    action: 'Uploaded',
    file: file.title || 'Untitled',
    status: file.ocr_status || 'Available',
  }));

  // === File Type Counts in Bar Chart
  const fileTypeMap: Record<string, number> = {};
  homeNodeData?.items?.forEach(item => {
    if (item.ctype === 'document' && item.title) {
      const extMatch = item.title.match(/\.(\w+)$/);
      if (extMatch && extMatch[1]) {
        const fileType = extMatch[1].toLowerCase();
        fileTypeMap[fileType] = (fileTypeMap[fileType] || 0) + 1;
      }
    }
  });

  const fileTypeLabels = Object.keys(fileTypeMap);   // e.g. ['pdf', 'jpeg']
  const fileTypeData = Object.values(fileTypeMap);   // e.g. [5, 3]

  // Populate Stats Card
  const kpiCardData = [
    {
      icon: <Upload />,
      title: 'Uploaded Documents',
      value: summaryLoading || !summaryData ? '...' : summaryData.total_uploads.toString(),
      color: '#4CAF50' // green
    },
    {
      icon: <Download />,
      title: 'Downloaded Documents',
      value: summaryLoading || !summaryData ? '...' : summaryData.total_downloads.toString(),
      color: '#2196F3' // blue
    },
    {
      icon: <Trash2 />,
      title: 'Deleted Documents',
      value: summaryLoading || !summaryData ? '...' : summaryData.total_deletions.toString(),
      color: '#F44336' // red
    }
  ];

  // Populate Storage
  const storageData = {
    icon: <HardDrive />,
    value: '-- GB',
    label: 'Storage Used',
    tooltip: 'Total storage space used by your documents'
  };

  if (isLoading) return <div className={styles.reportPage}>Loading report...</div>;
  if (error) return <div className={styles.reportPage}>Error loading report.</div>;

  return (
    <div className={styles.reportPage}>
      <div className={styles.rpHeader}>
        <h1 className={styles.title}>Report</h1>
        <p className={styles.subtitle}>Overview of document system usage and settings</p>
      </div>
      <section className={styles.rpBody}>
        <div className={styles.statSection}>
          <h2 className={styles.sectionTitle}>Document Statistics</h2>
          <div className={styles.statsGrid}>
            {kpiCardData.map((kpi, index) => (
              <div className={styles.statItem} key={index} style={{ borderLeft: `5px solid ${kpi.color}` }}>
                <div>
                  <div className={styles.statValue}>{kpi.value}</div>
                  <span className={styles.statLabel}>{kpi.title}</span>
                </div>
                <div className={styles.statIcon} style={{ color: kpi.color }}>{kpi.icon}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.fileStorageSection}>
          <div className={styles.fileSection}>
            <h2 className={styles.sectionTitle}>File Type Breakdown</h2>
            <div className={styles.chartContainer} title="Visual representation of file types">
              <DoughnutChart labels={fileTypeLabels} values={fileTypeData} />
            </div>
          </div>
          <div className={styles.storageSection}>
            <h2 className={styles.sectionTitle}>Storage Accumulated</h2>
            <div className={styles.statItem}>
              <div>
                <div className={styles.statValue}>{storageData.value}</div>
                <span className={styles.statLabel}>{storageData.label}</span>
              </div>
              <div className={styles.statIcon}>{storageData.icon}</div>
            </div>
          </div>
        </div>
        <div className={styles.docuSection}>
          <h2 className={styles.sectionTitle}>All Uploaded Documents</h2>
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th title="Date and time of the action">Timestamp</th>
                <th title="User who performed the action">User</th>
                <th title="Type of action (Import, Export, etc.)">Action</th>
                <th title="Name of the file affected">File Name</th>
                <th title="Result or outcome of the action">Status</th>
              </tr>
            </thead>
            <tbody>
              {documentRows.map((doc, idx) => (
                <tr key={idx}>
                  <td>{doc.timestamp}</td>
                  <td>{doc.user}</td>
                  <td>{doc.action}</td>
                  <td>{doc.file}</td>
                  <td>{doc.status}</td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </section>
    </div>
  );
}