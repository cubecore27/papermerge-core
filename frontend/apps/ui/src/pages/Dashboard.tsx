import React, { useEffect, useState } from 'react';
import { getDefaultHeaders } from '@/utils';

import { useNavigate } from 'react-router-dom';
import {
  FileText, Upload, Scan, Tag, FolderOpen,
  Search, AlertCircle, HardDrive, CheckCircle, XCircle
} from 'lucide-react';

import styles from './dashboard.module.css';

// Components
import LineChart from '@/components/Charts/Line';
import DoughnutChart from '@/components/Charts/Doughnut';
import BarChart from '@/components/Charts/Bar';

// Hooks & State
import { useAppSelector } from '@/app/hooks';
import { selectCurrentUser } from '@/slices/currentUser';
import { useGetPaginatedNodesQuery } from '@/features/nodes/apiSlice';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectCurrentUser);

  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(true);
  const [errorDocuments, setErrorDocuments] = useState<boolean>(false);
  const [storageSize, setStorageSize] = useState<number | null>(null);
  const [loadingStorage, setLoadingStorage] = useState<boolean>(true);

  // Fetch data
  useEffect(() => {
    if (!currentUser?.id) return;

    const headers = getDefaultHeaders();

    // Fetch Documents
    const fetchUserDocuments = async () => {
      try {
        setLoadingDocuments(true);

        // Initialize headers
        const headers = getDefaultHeaders();

        const res = await fetch(
          `http://127.0.0.1:8000/api/stats/user-documents`,
          {
            credentials: 'include',
            headers
          }
        );
        if (!res.ok) throw new Error('Failed to fetch user documents');
        const data = await res.json();

        // Filter client-side by currentUser.id
        const filteredDocs = data.filter(doc => doc.user_id === currentUser.id);

        setUserDocuments(filteredDocs);
        setErrorDocuments(false);
      } catch (err) {
        console.error(err);
        setErrorDocuments(true);
      } finally {
        setLoadingDocuments(false);
      }
    };

    // Fetch Activities
    const fetchActivities = async () => {
      try {
        const res = await fetch(
          'http://127.0.0.1:8000/api/stats/all-activities',
          {
            credentials: 'include',
            headers
          }
        );
        if (!res.ok) throw new Error('Failed to fetch activities');
        const data = await res.json();

        const filteredActivities = data.filter(activity => activity.user_id === currentUser.id);

        console.log('🧾 Filtered User Activities:', filteredActivities);
        setActivities(filteredActivities);

      } catch (err) {
        console.error(err);
      }
    };

    fetchUserDocuments();
    fetchActivities();

    // Fetch storage size
    const fetchStorageSize = async () => {
      try {
        setLoadingStorage(true);

        // Use the endpoint with user ID for filtering by current user
        const res = await fetch(
          `http://127.0.0.1:8000/api/document-stats/user-total-size/${currentUser.id}`,
          {
            credentials: 'include',
            headers
          }
        );

        if (!res.ok) throw new Error('Failed to fetch storage size');
        const data = await res.json();
        setStorageSize(data.total_size);
      } catch (err) {
        console.error(err);
        setStorageSize(null); // Handle error by setting storage size to null
      } finally {
        setLoadingStorage(false);
      }
    };


    fetchStorageSize();

  }, [currentUser?.id]);

  const docsData = { items: userDocuments };

  // Fetch data for tags
  const {
    data: homeNodeData,
    isLoading: homeDataLoading,
    error: homeDataError
  } = useGetPaginatedNodesQuery({
    nodeID: currentUser?.home_folder_id || '',
    page_number: 1,
    page_size: 1000,
    sortDir: 'az',
    sortColumn: 'title'
  }, {
    skip: !currentUser?.home_folder_id
  });

  // === KPI Calculations ===
  const totalDocuments = docsData.items.filter(item => item.ctype === 'document').length;
  const totalFolders = homeNodeData?.items?.filter(item => item.ctype === 'folder').length || 0;
  const untaggedDocuments = homeNodeData?.items?.filter(
    item => item.ctype === 'document' && (!item.tags || item.tags.length === 0)
  ).length || 0;

  // === Tag Stats ===
  const tagCountMap: Record<string, number> = {};
  homeNodeData?.items?.forEach(item => {
    item.tags?.forEach(tag => {
      const tagName = tag.name;
      tagCountMap[tagName] = (tagCountMap[tagName] || 0) + 1;
    });
  });
  const tagLabels = Object.keys(tagCountMap);
  const tagValues = Object.values(tagCountMap);

  // === Monthly Upload Data ===
  const getMonthLabel = (dateStr: string) =>
    new Date(dateStr).toLocaleString('default', { month: 'short' });

  const monthlyUploadMap: Record<string, number> = {};
  docsData.items.forEach(item => {
    if (item.ctype === 'document' && item.created_at) {
      const month = getMonthLabel(item.created_at);
      monthlyUploadMap[month] = (monthlyUploadMap[month] || 0) + 1;
    }
  });

  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartLabels = monthOrder.filter(m => monthlyUploadMap[m]);
  const chartValues = chartLabels.map(m => monthlyUploadMap[m]);

  // console.log("Chart Labels:", chartLabels);
  // console.log("Chart Values:", chartValues);

  // === File Type Data ===
  const fileTypeMap: Record<string, number> = {};
  docsData.items.forEach(item => {
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

  // === KPI Cards ===
  const kpiData = [
    {
      icon: FileText,
      value: loadingDocuments ? '...' : totalDocuments.toString(),
      label: 'Total Documents',
      tooltip: 'Total number of document files in your home folder',
    },
    {
      icon: FolderOpen,
      value: loadingDocuments ? '...' : totalFolders.toString(),
      label: 'Total Folders',
      tooltip: 'Total number of folders in your home folder',
    },
    {
      icon: Tag,
      value: loadingDocuments ? '...' : untaggedDocuments.toString(),
      label: 'Untagged Files',
      tooltip: 'Documents that currently do not have any tags assigned',
    },
    {
      icon: HardDrive,
      value: loadingStorage ? '...' : (storageSize !== null ? `${(storageSize / (1024 * 1024)).toFixed(2)} MB` : '--'),
      label: 'Storage Used',
      tooltip: 'Total storage space used by your documents',
    },
  ];

  // === Recent Activity ===
  // Sort activities from latest to oldest and show only the 5 most recent
  const recentActivity = activities
    .slice()
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5)
    .map((act, idx) => ({
      // Use action for icon, fallback to Upload
      icon: Upload,
      text: act.action ? `${act.action.replace(/_/g, ' ')}` : 'Activity',
      time: act.created_at ? new Date(act.created_at).toLocaleString() : '',
      tooltip: act.activity_metadata ? JSON.stringify(act.activity_metadata) : '',
      username: act.username || '',
      node_id: act.node_id || '',
    }));

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title} title={`Welcome back, ${currentUser?.username || 'User'}!`}>
          Welcome, <span>{currentUser?.username || 'User'}!</span>
        </h1>
        <p className={styles.subtitle} title="Overview of your document management system">
          Document management system overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {errorDocuments ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#dc2626' }} title="Error loading dashboard data">
            Error loading dashboard data
          </div>
        ) : (
          kpiData.map((item, index) => (
            <div key={index} className={styles.kpiCard} title={item.tooltip}>
              <item.icon className={styles.kpiIcon} aria-hidden="true" />
              <h3 className={styles.kpiValue}>{item.value}</h3>
              <p className={styles.kpiLabel}>{item.label}</p>
            </div>
          ))
        )}
      </div>

      {/* Main Content */}
      <div className={styles.mainGrid}>
        {/* Charts */}
        <div>
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard} title="Breakdown of file types in your system">
              <h3 className={styles.chartTitle}>Document Types</h3>
              <div className={styles.chartPlaceholder}>
                {fileTypeLabels.length ? (
                  <BarChart labels={fileTypeLabels} dataPoints={fileTypeData} />
                ) : (
                  <div className={styles.noDataText}>No documents found.</div>
                )}
              </div>

            </div>
            <div className={styles.chartCard} title="Distribution of tags applied to documents">
              <h3 className={styles.chartTitle}>Tag Distribution</h3>
              <div className={styles.chartPlaceholder}>
                {tagValues.length > 0 ? (
                  <DoughnutChart labels={tagLabels} values={tagValues} />
                ) : (
                  <div className={styles.noDataText}>No tag data available.</div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.chartCard} title="Monthly growth of documents uploaded">
            <h3 className={styles.chartTitle}>Document Growth</h3>
            <div className={styles.chartPlaceholder}>
              <LineChart labels={chartLabels} dataPoints={chartValues} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className={styles.sectionTitle} title="Quick actions to get started">Quick Actions</h2>
          <div className={styles.actionGrid}>
            {[
              { icon: Upload, text: 'Upload Document', onClick: () => navigate('/home'), tooltip: 'Upload new documents to your account' },
              { icon: Tag, text: 'Create Tag', onClick: () => navigate('/tags'), tooltip: 'Create new tags for organizing your documents' },
              { icon: Tag, text: 'Create Categories', onClick: () => navigate('/document-types'), tooltip: 'Define new document categories' },
            ].map((action, idx) => (
              <div
                key={idx}
                className={`${styles.actionCard}`}
                onClick={action.onClick}
                title={action.tooltip}
                role="button"
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? action.onClick() : null)}
              >
                <action.icon className={styles.actionIcon} aria-hidden="true" />
                <p className={styles.actionText}>{action.text}</p>
              </div>
            ))}
          </div>

          <br />

          {/* Recent Activity */}
          <div className={styles.card} title="Recent activity in your account">
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            {recentActivity.map((activity, index) => (
              <div key={index} className={styles.activityItem} title={activity.tooltip}>
                <activity.icon className={styles.activityIcon} aria-hidden="true" />
                <div className={styles.activityText}>
                  <b>{activity.username}</b> {activity.text}
                  {activity.node_id && (
                    <span style={{ color: '#888', fontSize: '11px', marginLeft: 4 }}>
                      (Node: {activity.node_id.slice(0, 8)})
                    </span>
                  )}
                </div>
                <span className={styles.activityTime}>{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {/* <div className={styles.bottomGrid}>
        <div className={styles.card} title="Recent activity in your account">
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          {recentActivity.map((activity, index) => (
            <div key={index} className={styles.activityItem} title={activity.tooltip}>
              <activity.icon className={styles.activityIcon} aria-hidden="true" />
              <div className={styles.activityText}>
                <b>{activity.username}</b> {activity.text}
                {activity.node_id && (
                  <span style={{ color: '#888', fontSize: '11px', marginLeft: 4 }}>
                    (Node: {activity.node_id.slice(0, 8)})
                  </span>
                )}
              </div>
              <span className={styles.activityTime}>{activity.time}</span>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
};

export default Dashboard;