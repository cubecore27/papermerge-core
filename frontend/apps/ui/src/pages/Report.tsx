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
import PieChart from '@/components/Charts/PieChart';
import BarChart from '@/components/Charts/Bar';
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
        const res = await fetch('http://127.0.0.1:8000/api/stats/summary', {
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
      color: '#10b981' // emerald-500
    },
    {
      icon: <Download />,
      title: 'Downloaded Documents',
      value: summaryLoading || !summaryData ? '...' : summaryData.total_downloads.toString(),
      color: '#3b82f6' // blue-500
    },
    {
      icon: <Trash2 />,
      title: 'Deleted Documents',
      value: summaryLoading || !summaryData ? '...' : summaryData.total_deletions.toString(),
      color: '#ef4444' // red-500
    },
    {
      icon: <HardDrive />,
      title: 'Storage Used',
      value: loadingStorage ? '...' : storageSize ? `${(storageSize / 1024 / 1024).toFixed(2)} MB` : 'Error',
      color: '#8b5cf6' // violet-500
    }
  ];

  // --- Fetch Tags by Group ---
  useEffect(() => {
    setTagsLoading(true);
    setTagsError(null);
    fetch('http://127.0.0.1:8000/api/stats/stats/tags-by-group', { // use full URL
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
    fetch('http://127.0.0.1:8000/api/stats/stats/summary', { // use full URL
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
    fetch('http://127.0.0.1:8000/api/stats/stats/advanced-summary', { // use full URL
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

  if (usersLoading || docsLoading) return <div className={styles.reportPage}><div className={styles.loadingState}>Loading report...</div></div>;
  if (usersError || docsError) {
    return (
      <div className={styles.reportPage}>
        <div className={styles.errorState}>
          <div>Error loading report.</div>
          {usersError && <pre>Users error: {JSON.stringify(usersError, null, 2)}</pre>}
          {docsError && <pre>Docs error: {docsError}</pre>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reportPage}>
      <div className={styles.rpHeader}>
        <h1 className={styles.title}>Analytics Dashboard</h1>
        <p className={styles.subtitle}>Overview of document system usage and performance metrics</p>
      </div>

      <div className={styles.rpBody}>
        {/* KPI Cards Section */}
        <section className={styles.section} title="Key Performance Indicators section">
          <h2 className={styles.sectionTitle} title="Key Performance Indicators">Key Performance Indicators</h2>
          <div className={styles.kpiGrid}>
            {kpiCardData.map((kpi, index) => (
              <div className={styles.kpiCard} key={index} title={kpi.title}>
                <div className={styles.kpiContent}>
                  <div className={styles.kpiIcon} style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }} title={kpi.title + ' Icon'}>
                    {kpi.icon}
                  </div>
                  <div className={styles.kpiText}>
                    <div className={styles.kpiValue} title={kpi.title + ' Value'}>{kpi.value}</div>
                    <div className={styles.kpiLabel}>{kpi.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Analytics Charts Section */}
        <div className={styles.chartsRow}>
          <section className={styles.chartSection} title="File Type Distribution">
            <h2 className={styles.sectionTitle} title="File Type Distribution">File Type Distribution</h2>
            <div className={styles.chartContainer}>
              {fileTypeLabels.length > 0 ? (
                <DoughnutChart labels={fileTypeLabels} values={fileTypeData} title="File Type Distribution Chart" />
              ) : (
                <div className={styles.noDataMessage}>No file type data available</div>
              )}
            </div>
          </section>

          <section className={styles.chartSection} title="Tags by Group">
            <h2 className={styles.sectionTitle} title="Tags by Group">Tags by Group</h2>
            <div className={styles.tagsContainer}>
              {tagsLoading ? (
                <div className={styles.loadingMessage}>Loading tags...</div>
              ) : tagsError ? (
                <div className={styles.errorMessage}>Error: {tagsError}</div>
              ) : tagsByGroup && Object.keys(tagsByGroup).length > 0 ? (
                <div className={styles.tagsByGroupGrid}>
                  {Object.entries(tagsByGroup).map(([group, tags]) => {
                    const labels = tags.map(t => t.tag);
                    const values = tags.map(t => t.count);
                    return (
                      <div key={group} className={styles.tagsGroupCard} title={`Tags for group ${group}`}>
                        <h4 className={styles.tagsGroupTitle} title={`Tag group: ${group}`}>{group}</h4>
                        <div className={styles.miniChartContainer}>
                          <DoughnutChart labels={labels} values={values} title={`Tags for group ${group}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.noDataMessage}>No tag data available</div>
              )}
            </div>
          </section>
        </div>

        {/* System Summary Section */}
        <section className={styles.section} title="System Summary">
          <h2 className={styles.sectionTitle} title="System Summary">System Summary</h2>
          {summary2Loading ? (
            <div className={styles.loadingMessage}>Loading summary...</div>
          ) : summary2Error ? (
            <div className={styles.errorMessage}>Error: {summary2Error}</div>
          ) : summary2 ? (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard} title="Active Users">
                <h3 className={styles.cardTitle} title="Active Users">Active Users</h3>
                <div className={styles.cardContent}>
                  {summary2.active_users && summary2.active_users.length > 0 ? (
                    <PieChart
                      labels={summary2.active_users.map((u: any) => u.username)}
                      dataPoints={summary2.active_users.map((u: any) => u.document_count)}
                      chartTitle="Active Users Document Count"
                    />
                  ) : <div className={styles.noDataMessage}>No active user data</div>}
                </div>
              </div>

              <div className={styles.summaryCard} title="Shared Documents">
                <h3 className={styles.cardTitle} title="Shared Documents">Shared Documents</h3>
                <div className={styles.cardContent}>
                  {summary2.shared_documents && summary2.shared_documents.length > 0 ? (
                    <div className={styles.sharedDocsList}>
                      {summary2.shared_documents.slice(0, 5).map((doc: any) => (
                        <div key={doc.node_id} className={styles.sharedDocItem}>
                          <span className={styles.docId}>{doc.node_id}</span>
                          <span className={styles.sharedWith}>
                            shared with {doc.shared_with_user || doc.shared_with_group || 'N/A'}
                          </span>
                        </div>
                      ))}
                      {summary2.shared_documents.length > 5 && (
                        <div className={styles.moreItemsIndicator}>
                          +{summary2.shared_documents.length - 5} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.noDataMessage}>No shared documents</div>
                  )}
                </div>
              </div>

              <div className={styles.summaryCard} title="Roles Distribution">
                <h3 className={styles.cardTitle} title="Roles Distribution">Roles Distribution</h3>
                <div className={styles.cardContent}>
                  {summary2.roles_summary && summary2.roles_summary.length > 0 ? (
                    <BarChart
                      labels={summary2.roles_summary.map((r: any) => r.role_name)}
                      dataPoints={summary2.roles_summary.map((r: any) => r.total_users)}
                    />
                  ) : <div className={styles.noDataMessage}>No roles data</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.noDataMessage}>No summary data available</div>
          )}
        </section>

        {/* Advanced Statistics Section */}
        <section className={styles.section} title="Advanced Analytics">
          <h2 className={styles.sectionTitle} title="Advanced Analytics">Advanced Analytics</h2>
          {advancedStatsLoading ? (
            <div className={styles.loadingMessage}>Loading advanced stats...</div>
          ) : advancedStatsError ? (
            <div className={styles.errorMessage}>Error: {advancedStatsError}</div>
          ) : advancedStats ? (
            <div className={styles.advancedGrid}>
              <div className={styles.advancedCard} title="Storage by User">
                <h3 className={styles.cardTitle} title="Storage by User">Storage by User</h3>
                <div className={styles.cardContent}>
                  {advancedStats.per_user && advancedStats.per_user.length > 0 ? (
                    <BarChart
                      labels={advancedStats.per_user.map((u: any) => u.username)}
                      dataPoints={advancedStats.per_user.map((u: any) => Number((u.total_bytes / 1024 / 1024).toFixed(2)))}
                    />
                  ) : <div className={styles.noDataMessage}>No per user data</div>}
                </div>
              </div>

              <div className={styles.advancedCard} title="Storage by Group">
                <h3 className={styles.cardTitle} title="Storage by Group">Storage by Group</h3>
                <div className={styles.cardContent}>
                  {advancedStats.per_group && advancedStats.per_group.length > 0 ? (
                    <div className={styles.statsList}>
                      {advancedStats.per_group.map((g: any) => (
                        <div key={g.group_id} className={styles.statsItem}>
                          <span className={styles.statsLabel}>{g.group_name}</span>
                          <div className={styles.statsValues}>
                            <span className={styles.statsValue}>{(g.total_bytes / 1024 / 1024).toFixed(2)} MB</span>
                            <span className={styles.statsSecondary}>{g.total_documents} docs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noDataMessage}>No group data</div>
                  )}
                </div>
              </div>

              <div className={styles.advancedCard} title="Document Types">
                <h3 className={styles.cardTitle} title="Document Types">Document Types</h3>
                <div className={styles.cardContent}>
                  {advancedStats.per_document_type && advancedStats.per_document_type.length > 0 ? (
                    <div className={styles.statsList}>
                      {advancedStats.per_document_type.map((dt: any) => (
                        <div key={dt.document_type_id} className={styles.statsItem}>
                          <span className={styles.statsLabel}>{dt.document_type_name}</span>
                          <div className={styles.statsValues}>
                            <span className={styles.statsValue}>{(dt.total_bytes / 1024 / 1024).toFixed(2)} MB</span>
                            <span className={styles.statsSecondary}>{dt.total_documents} docs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noDataMessage}>No document type data</div>
                  )}
                </div>
              </div>

              <div className={styles.advancedCard} title="Largest Documents">
                <h3 className={styles.cardTitle} title="Largest Documents">Largest Documents</h3>
                <div className={styles.cardContent}>
                  {advancedStats.largest_documents && advancedStats.largest_documents.length > 0 ? (
                    <div className={styles.statsList}>
                      {advancedStats.largest_documents.map((doc: any) => (
                        <div key={doc.node_id} className={styles.statsItem}>
                          <span className={styles.statsLabel}>{doc.title}</span>
                          <div className={styles.statsValues}>
                            <span className={styles.statsValue}>{(doc.total_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                            <span className={styles.statsSecondary}>{doc.version_count} versions</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noDataMessage}>No large documents data</div>
                  )}
                </div>
              </div>

              <div className={styles.advancedCard} title="File Size Distribution">
                <h3 className={styles.cardTitle} title="File Size Distribution">File Size Distribution</h3>
                <div className={styles.cardContent}>
                  {advancedStats.file_size_distribution && advancedStats.file_size_distribution.length > 0 ? (
                    <DoughnutChart
                      labels={advancedStats.file_size_distribution.map((dist: any) => dist.size_category)}
                      values={advancedStats.file_size_distribution.map((dist: any) => Number((dist.total_bytes / 1024 / 1024).toFixed(2)))}
                    />
                  ) : <div className={styles.noDataMessage}>No file size distribution data</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.noDataMessage}>No advanced stats available</div>
          )}
        </section>

        {/* Documents Table Section */}
        <section className={styles.section} title="Recent Documents">
          <h2 className={styles.sectionTitle} title="Recent Documents">Recent Documents</h2>
          <div className={styles.tableContainer}>
            <table className={styles.reportTable} title="Recent Documents Table">
              <thead>
                <tr>
                  <th title="Document Created Date">Created Date</th>
                  <th title="Document Owner User">User</th>
                  <th title="Document File Name">File Name</th>
                  <th title="OCR Processing Status">OCR Status</th>
                  <th title="User Account Status">User Status</th>
                </tr>
              </thead>
              <tbody>
                {documentRows.slice(0, 20).map((doc, idx) => {
                  let formattedDate = 'Invalid Date';
                  if (doc.created_at) {
                    const createdAt = new Date(doc.created_at);
                    if (!isNaN(createdAt.getTime())) {
                      formattedDate = createdAt.toLocaleDateString();
                    }
                  }
                  return (
                    <tr key={idx} title={`Document: ${doc.file} by ${doc.user}`}> 
                      <td title="Created Date">{formattedDate}</td>
                      <td title="User">{doc.user}</td>
                      <td className={styles.fileName} title={doc.file}>{doc.file}</td>
                      <td title="OCR Status">{doc.ocr ? 'Processed' : 'Not Processed'}</td>
                      <td title="User Status">{doc.is_active ? 'Active' : 'Inactive'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {documentRows.length > 20 && (
              <div className={styles.tableFooter}>
                Showing 20 of {documentRows.length} documents
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}