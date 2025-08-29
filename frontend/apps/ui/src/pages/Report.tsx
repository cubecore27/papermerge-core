// React
import { useEffect, useState } from 'react';

// styles
import styles from './report.module.css';

// Lucide Icons
import {
  Upload,
  Download,
  Trash2,
  HardDrive
} from 'lucide-react';

// Redux & API
import { useAppSelector } from '@/app/hooks';
import { useGetUsersQuery } from '@/features/users/apiSlice';
import { selectCurrentUser } from '@/slices/currentUser';
import DoughnutChart from '@/components/Charts/Doughnut';
import { getDefaultHeaders } from '@/utils';
import { Badge } from '@/components/Badge'; // If you have a Badge component for tags

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

  // --- New State Hooks ---
  const [tagsByGroup, setTagsByGroup] = useState<Record<string, { tag: string; count: number }[]> | null>(null);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState<string | null>(null);

  const [summary2, setSummary2] = useState<any>(null);
  const [summary2Loading, setSummary2Loading] = useState(true);
  const [summary2Error, setSummary2Error] = useState<string | null>(null);

  const [advancedStats, setAdvancedStats] = useState<any>(null);
  const [advancedStatsLoading, setAdvancedStatsLoading] = useState(true);
  const [advancedStatsError, setAdvancedStatsError] = useState<string | null>(null);

  // Fetch all documents for all users
  useEffect(() => {
    if (!users) return;
    // LOG
    // console.log('Fetched users:', users);
    setDocsLoading(true);
    setDocsError(null);
    const headers = getDefaultHeaders();
    Promise.all(
      users.map(async (user: any) => {
        if (!user.home_folder_id) return [];
        const url = `http://localhost:8000/api/nodes/${user.home_folder_id}?page_number=1&page_size=1000&order_by=title`;
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
      console.log('All documents:', allDocs);
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
        const res = await fetch('http://localhost:8000/api/stats/summary', {
          method: 'GET',
          headers // Apply headers here
        });
        if (!res.ok) throw new Error('Failed to fetch summary data');
        const data = await res.json();
        setSummaryData(data);
        // LOG
        // console.log('Fetched summary data:', data);
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
    fetch('http://localhost:8000/api/document-stats/total-size', {
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
      is_active: file._user?.is_active || false // Add is_active field
    }))
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Descending: latest first
    });

  // LOG
  // console.log('Document Row:', documentRows);

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

  // --- Fetch Tags by Group ---
  useEffect(() => {
    setTagsLoading(true);
    setTagsError(null);
    fetch('http://localhost:8000/api/stats/stats/tags-by-group', { // use full URL
      headers: getDefaultHeaders(),
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch tags by group');
        return res.json();
      })
      .then(setTagsByGroup)
      .catch(e => setTagsError(e.message))
      .finally(() => setTagsLoading(false));
  }, []);

  // --- Fetch Summary (Active Users, Shared Docs, Roles) ---
  useEffect(() => {
    setSummary2Loading(true);
    setSummary2Error(null);
    fetch('http://localhost:8000/api/stats/stats/summary', { // use full URL
      headers: getDefaultHeaders(),
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch summary');
        return res.json();
      })
      .then(setSummary2)
      .catch(e => setSummary2Error(e.message))
      .finally(() => setSummary2Loading(false));
  }, []);

  // --- Fetch Advanced Document Statistics ---
  useEffect(() => {
    setAdvancedStatsLoading(true);
    setAdvancedStatsError(null);
    fetch('http://localhost:8000/api/stats/stats/advanced-summary', { // use full URL
      headers: getDefaultHeaders(),
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch advanced stats');
        return res.json();
      })
      .then(setAdvancedStats)
      .catch(e => setAdvancedStatsError(e.message))
      .finally(() => setAdvancedStatsLoading(false));
  }, []);

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
                {/* <th title="OCR processing status">OCR</th> */}
                <th title="Whether the user is active or not">Active Status</th> {/* Add new column */}
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
                    {/* <td>
                      {doc.thumbnail_url ? (
                        <img
                          src={doc.thumbnail_url}
                          alt="Document Thumbnail"
                          className={styles.thumbnail}
                        />
                      ) : (
                        'No Preview'
                      )}
                    </td> */}
                    <td>{doc.ocr ? 'Processed' : 'Not Processed'}</td>
                    <td>{doc.is_active ? 'Active' : 'Inactive'}</td> {/* Display Active Status */}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* --- Tags by Group Section --- */}
        <section className={styles.statSection}>
          <h2 className={styles.sectionTitle}>Tags by Group</h2>
          {tagsLoading ? (
            <div>Loading tags...</div>
          ) : tagsError ? (
            <div style={{ color: 'red' }}>Error: {tagsError}</div>
          ) : tagsByGroup && Object.keys(tagsByGroup).length > 0 ? (
            <div className={styles.tagsByGroupGrid}>
              {Object.entries(tagsByGroup).map(([group, tags]) => (
                <div key={group} className={styles.tagsGroupCard}>
                  <h3 className={styles.tagsGroupTitle}>{group}</h3>
                  <div className={styles.tagsList}>
                    {tags.map(({ tag, count }) => (
                      <span key={tag} className={styles.tagBadge}>
                        {tag} <span className={styles.tagCount}>({count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>No tag data available.</div>
          )}
        </section>

        {/* --- Summary (Active Users, Shared Docs, Roles) --- */}
        <section className={styles.statSection}>
          <h2 className={styles.sectionTitle}>System Summary</h2>
          {summary2Loading ? (
            <div>Loading summary...</div>
          ) : summary2Error ? (
            <div style={{ color: 'red' }}>Error: {summary2Error}</div>
          ) : summary2 ? (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <h3>Active Users</h3>
                <ul>
                  {summary2.active_users?.map((u: any) => (
                    <li key={u.user_id}>
                      <strong>{u.username}</strong> ({u.document_count} docs)
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.summaryCard}>
                <h3>Shared Documents</h3>
                <ul>
                  {summary2.shared_documents?.map((doc: any) => (
                    <li key={doc.node_id}>
                      {doc.node_id} shared with {doc.shared_with_user || doc.shared_with_group || 'N/A'} ({doc.share_count})
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.summaryCard}>
                <h3>Roles Summary</h3>
                <ul>
                  {summary2.roles_summary?.map((role: any) => (
                    <li key={role.role_id}>
                      <strong>{role.role_name}</strong>: {role.total_users} users, {role.total_docs_accessed} docs accessed
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div>No summary data available.</div>
          )}
        </section>

        {/* --- Advanced Document Statistics --- */}
        <section className={styles.statSection}>
          <h2 className={styles.sectionTitle}>Advanced Document Statistics</h2>
          {advancedStatsLoading ? (
            <div>Loading advanced stats...</div>
          ) : advancedStatsError ? (
            <div style={{ color: 'red' }}>Error: {advancedStatsError}</div>
          ) : advancedStats ? (
            <div className={styles.advancedStatsGrid}>
              <div className={styles.advancedStatsCard}>
                <h3>Per User</h3>
                <ul>
                  {advancedStats.per_user?.map((u: any) => (
                    <li key={u.user_id}>
                      <strong>{u.username}</strong>: {(u.total_bytes / 1024 / 1024).toFixed(2)} MB, {u.total_documents} docs
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.advancedStatsCard}>
                <h3>Per Group</h3>
                <ul>
                  {advancedStats.per_group?.map((g: any) => (
                    <li key={g.group_id}>
                      <strong>{g.group_name}</strong>: {(g.total_bytes / 1024 / 1024).toFixed(2)} MB, {g.total_documents} docs
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.advancedStatsCard}>
                <h3>Per Document Type</h3>
                <ul>
                  {advancedStats.per_document_type?.map((dt: any) => (
                    <li key={dt.document_type_id}>
                      <strong>{dt.document_type_name}</strong>: {(dt.total_bytes / 1024 / 1024).toFixed(2)} MB, {dt.total_documents} docs
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.advancedStatsCard}>
                <h3>Largest Documents</h3>
                <ul>
                  {advancedStats.largest_documents?.map((doc: any) => (
                    <li key={doc.node_id}>
                      <strong>{doc.title}</strong>: {(doc.total_size_bytes / 1024 / 1024).toFixed(2)} MB, {doc.version_count} versions
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.advancedStatsCard}>
                <h3>File Size Distribution</h3>
                <ul>
                  {advancedStats.file_size_distribution?.map((dist: any) => (
                    <li key={dist.size_category}>
                      <strong>{dist.size_category}</strong>: {dist.file_count} files, {(dist.total_bytes / 1024 / 1024).toFixed(2)} MB
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div>No advanced stats available.</div>
          )}
        </section>

      </section>
    </div>
  );
}