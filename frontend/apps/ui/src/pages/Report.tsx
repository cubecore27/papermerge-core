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

import { useGetUsersQuery } from '@/features/users/apiSlice';
import DoughnutChart from '@/components/Charts/Doughnut';
import { getDefaultHeaders, getBaseURL } from '@/utils';

export default function Report() {
  // Fetch all users
  const { data: users, isLoading: usersLoading, error: usersError } = useGetUsersQuery();

  // State for all documents
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<null | string>(null);

  useEffect(() => {
    const fetchAllDocs = async () => {
      if (!users) return;
      setDocsLoading(true);
      setDocsError(null);
      try {
        const headers = getDefaultHeaders(); // Use headers with JWT token
        const baseURL = getBaseURL(true); // Dynamically fetch base URL
        const results = await Promise.all(
          users.map(async (user: any) => {
            if (!user.home_folder_id) {
              console.warn(`User ${user.username} has no home_folder_id`);
              return [];
            }
            const url = `${baseURL}/api/nodes/${user.home_folder_id}?page_number=1&page_size=1000&order_by=title`;
            console.log(`Fetching: ${url}`);
            try {
              const res = await fetch(url, {
                credentials: "include",
                headers // Apply headers here
              });
              if (!res.ok) {
                const errText = await res.text();
                const msg = `Failed to fetch for ${user.username} (${user.id}): status ${res.status} - ${errText}`;
                console.error(msg);
                throw new Error(msg);
              }
              const data = await res.json();
              return (data.items || []).map((doc: any) => ({ ...doc, _user: user }));
            } catch (err) {
              const msg = `Exception for user ${user.username} (${user.id}): ${err}`;
              console.error(msg);
              throw new Error(msg);
            }
          })
        );
        setAllDocs(results.flat());
      } catch (e: any) {
        console.error('Error fetching documents:', e);
        setDocsError(e?.message || String(e));
      } finally {
        setDocsLoading(false);
      }
    };
    if (users) fetchAllDocs();
  }, [users]);

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
        const headers = getDefaultHeaders(); // Use headers with JWT token
        const baseURL = getBaseURL(true); // Dynamically fetch base URL
        const res = await fetch(`${baseURL}/api/stats/summary`, {
          method: 'GET',
          headers // Apply headers here
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

  // console.log('Summary state:', summaryData);

  // Aggregate all docs for table
  const documentRows = allDocs.map(file => ({
    timestamp: 'N/A',
    // user: file._user ? `${file._user.username} (${file._user.id})` : (file.user_id ? `User: ${file.user_id}` : 'Unknown'),
    user: file._user?.username || (file.user_id ? `User: ${file.user_id}` : 'Unknown'),
    action: 'Uploaded',
    file: file.title || 'Untitled',
    status: file.ocr_status || 'Available',
  }));

  // === File Type Counts in Bar Chart (all docs)
  const fileTypeMap: Record<string, number> = {};
  allDocs.forEach(item => {
    if (item.ctype === 'document' && item.title) {
      const extMatch = item.title.match(/\.(\w+)$/);
      if (extMatch && extMatch[1]) {
        const fileType = extMatch[1].toLowerCase();
        fileTypeMap[fileType] = (fileTypeMap[fileType] || 0) + 1;
      }
    }
  });
  const fileTypeLabels = Object.keys(fileTypeMap);
  const fileTypeData = Object.values(fileTypeMap);

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

  if (usersLoading || docsLoading) return <div className={styles.reportPage}>Loading report...</div>;
  if (usersError || docsError) {
    return (
      <div className={styles.reportPage} style={{ color: 'red' }}>
        <div>Error loading report.</div>
        {usersError && <pre>Users error: {JSON.stringify(usersError, null, 2)}</pre>}
        {docsError && <pre>Docs error: {docsError}</pre>}
      </div>
    );
  }

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
                {/* <th title="Type of action (Import, Export, etc.)">Action</th> */}
                <th title="Name of the file affected">File Name</th>
                <th title="Result or outcome of the action">Status</th>
              </tr>
            </thead>
            <tbody>
              {documentRows.map((doc, idx) => (
                <tr key={idx}>
                  <td>{doc.timestamp}</td>
                  <td>{doc.user}</td>
                  {/* <td>{doc.action}</td> */}
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