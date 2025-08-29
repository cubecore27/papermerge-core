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
import { useAppSelector } from '@/app/hooks';
import { useGetUsersQuery } from '@/features/users/apiSlice';
import { selectCurrentUser } from '@/slices/currentUser';
import DoughnutChart from '@/components/Charts/Doughnut';
import { getDefaultHeaders } from '@/utils';

export default function Report() {
  // Fetch all users
  const { data: users, isLoading: usersLoading, error: usersError } = useGetUsersQuery();
  const currentUser = useAppSelector(selectCurrentUser);

  // State for all documents
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<null | string>(null);
  const [storageSize, setStorageSize] = useState<number | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);

  // Fetch all documents for all users
  useEffect(() => {
    if (!users) return;
    // LOG
    console.log('Fetched users:', users);
    setDocsLoading(true);
    setDocsError(null);
    const headers = getDefaultHeaders();
    Promise.all(
      users.map(async (user: any) => {
        if (!user.home_folder_id) return [];
        const url = `http://127.0.0.1:8000/api/nodes/${user.home_folder_id}?page_number=1&page_size=1000&order_by=title`;
        try {
          const res = await fetch(url, { credentials: 'include', headers });
          if (!res.ok) throw new Error('Failed to fetch docs');
          const data = await res.json();
          return (data.items || []).map((doc: any) => ({ ...doc, _user: user }));
        } catch (err) {
          return [];
        }
      })
    )
      .then(results => setAllDocs(results.flat()))
      .catch(e => setDocsError(e?.message || String(e)))
      .finally(() => setDocsLoading(false));
  }, [users]);

  // LOG
  useEffect(() => {
    if (allDocs.length > 0) {
      console.log('All documents:', allDocs); // <-- Log the documents
    }
  }, [allDocs]);


  // === NEW: Fetch KPI Summary from API ===
  const [summaryData, setSummaryData] = useState<{
    total_uploads: number;
    total_downloads: number;
    total_deletions: number;
  } | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  // Fetch all the users actions
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setSummaryLoading(true);
        const headers = getDefaultHeaders(); // Use headers with JWT token
        const res = await fetch('http://127.0.0.1:8000/api/stats/summary', {
          method: 'GET',
          headers // Apply headers here
        });
        if (!res.ok) throw new Error('Failed to fetch summary data');
        const data = await res.json();
        setSummaryData(data);
        // LOG
        console.log('Fetched summary data:', data);
      } catch (err) {
        console.error('Error fetching summary:', err);
        setSummaryError(true);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummary();
  }, []);

  // Fetch storage size (total for all docs)
  useEffect(() => {
    setLoadingStorage(true);
    const headers = getDefaultHeaders();
    fetch('http://127.0.0.1:8000/api/document-stats/total-size', {
      credentials: 'include',
      headers
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch storage size');
        return res.json();
      })
      .then(data => setStorageSize(data.total_size))
      .catch(() => setStorageSize(null))
      .finally(() => setLoadingStorage(false));
  }, []);

  // console.log('Summary state:', summaryData);

  // Aggregate all docs for table with correct fields
  const documentRows = allDocs
    .map(file => ({
      created_at: file.created_at || file._user?.created_at || null,
      user: file._user?.username || (file.user_id ? `User: ${file.user_id}` : 'Unknown'),
      file: file.title || 'Untitled',
      thumbnail_url: file.thumbnail_url,
      ocr: file.ocr,
      ocr_status: file.ocr_status,
    }))
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Descending: latest first
    });

  // LOG
  console.log('Document Row:', documentRows);

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
          {/* Storage Section */}
          <div className={styles.storageSection}>
            <h2 className={styles.sectionTitle}>Storage Accumulated</h2>
            <div className={styles.statItem}>
              <div>
                <div className={styles.statValue}>
                  {loadingStorage ? '...' : storageSize ? `${(storageSize / 1024 / 1024).toFixed(2)} MB` : 'Error fetching'}
                </div>
                <span className={styles.statLabel}>{storageSize !== null ? 'Storage Used' : 'Error'}</span>
              </div>
              <div className={styles.statIcon}>
                <HardDrive />
              </div>
            </div>
          </div>
        </div>
        {/* <div className={styles.docuSection}>
          <h2 className={styles.sectionTitle}>All Uploaded Documents</h2>
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th title="Date and time of the action">Timestamp</th>
                <th title="User who performed the action">User</th>
                <th title="Name of the file affected">File Name</th>
                <th title="Result or outcome of the action">Status</th>
              </tr>
            </thead>
            <tbody>
              {documentRows.map((doc, idx) => (
                <tr key={idx}>
                  <td>{doc.timestamp}</td>
                  <td>{doc.user}</td>
                  <td>{doc.file}</td>
                  <td>{doc.status}</td>
                </tr>
              ))}
            </tbody>

          </table>
        </div> */}
        <div className={styles.docuSection}>
          <h2 className={styles.sectionTitle}>All Uploaded Documents</h2>
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th title="Date and time the document was created">Created At</th>
                <th title="User who performed the action">User</th>
                <th title="Name of the file affected">File Name</th>
                <th title="Document's preview thumbnail">Thumbnail</th>
                <th title="OCR processing status">OCR</th>
              </tr>
            </thead>
            <tbody>
              {documentRows.map((doc, idx) => {
                let formattedDate = 'Invalid Date';
                if (doc.created_at) {
                  const createdAt = new Date(doc.created_at);
                  if (!isNaN(createdAt.getTime())) {
                    formattedDate = createdAt.toLocaleDateString();
                  }
                }
                return (
                  <tr key={idx}>
                    <td>{formattedDate}</td>
                    <td>{doc.user}</td>
                    <td>{doc.file}</td>
                    <td>
                      {doc.thumbnail_url ? (
                        <img
                          src={doc.thumbnail_url}
                          alt="Document Thumbnail"
                          className={styles.thumbnail}
                        />
                      ) : (
                        'No Preview'
                      )}
                    </td>
                    <td>{doc.ocr ? 'Processed' : 'Not Processed'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </section>
    </div>
  );
}