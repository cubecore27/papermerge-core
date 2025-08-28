import React from 'react';
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
import { useGetPaginatedNodesQuery } from '@/features/nodes/apiSlice';
import { useAppSelector } from '@/app/hooks';
import { selectCurrentUser } from '@/slices/currentUser';

const Dashboard = () => {
  const navigate = useNavigate();
  const [hoveredAction, setHoveredAction] = React.useState<number | null>(null);
  const currentUser = useAppSelector(selectCurrentUser);

  // Fetch documents
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

  const totalDocuments = homeNodeData?.items?.filter(item => item.ctype === 'document').length || 0;
  const totalFolders = homeNodeData?.items?.filter(item => item.ctype === 'folder').length || 0;
  const untaggedDocuments = homeNodeData?.items?.filter(
    item => item.ctype === 'document' && (!item.tags || item.tags.length === 0)
  ).length || 0;

  // === Generate tag distribution data
  const tagCountMap: Record<string, number> = {};
  homeNodeData?.items?.forEach(item => {
    item.tags?.forEach(tag => {
      const tagName = tag.name;
      tagCountMap[tagName] = (tagCountMap[tagName] || 0) + 1;
    });
  });

  const tagLabels = Object.keys(tagCountMap);
  const tagValues = Object.values(tagCountMap);
  // Utility: format date to 'Jan', 'Feb', etc.
  const getMonthLabel = (dateStr: string) =>
    new Date(dateStr).toLocaleString('default', { month: 'short' });

  // Line Graph data
  const monthlyUploadMap: Record<string, number> = {};
  homeNodeData?.items?.forEach(item => {
    if (item.ctype === 'document' && (item as any).created_at) {
      const month = getMonthLabel((item as any).created_at);
      monthlyUploadMap[month] = (monthlyUploadMap[month] || 0) + 1;
    }
  });

  // Optional: control order of months
  const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const chartLabels = monthOrder.filter(month => monthlyUploadMap[month]);
  const chartValues = chartLabels.map(month => monthlyUploadMap[month]);

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

  const kpiData = [
    {
      icon: FileText,
      value: homeDataLoading ? '...' : totalDocuments.toString(),
      label: 'Total Documents',
      tooltip: 'Total number of document files in your home folder'
    },
    {
      icon: FolderOpen,
      value: homeDataLoading ? '...' : totalFolders.toString(),
      label: 'Total Folders',
      tooltip: 'Total number of folders in your home folder'
    },
    {
      icon: Tag,
      value: homeDataLoading ? '...' : untaggedDocuments.toString(),
      label: 'Untagged Files',
      tooltip: 'Documents that currently do not have any tags assigned'
    },
    {
      icon: HardDrive,
      value: '-- GB',
      label: 'Storage Used',
      tooltip: 'Total storage space used by your documents'
    }
  ];

  const quickActions = [
    { icon: Upload, text: 'Upload Document', onClick: () => navigate('/home'), tooltip: 'Upload new documents to your account' },
    { icon: Tag, text: 'Create Tag', onClick: () => navigate('/tags'), tooltip: 'Create new tags for organizing your documents' },
    { icon: Tag, text: 'Create Categories', onClick: () => navigate('/document-types'), tooltip: 'Define new document categories' },
  ];

  const recentActivity = [
    { icon: Upload, text: 'invoice_2024_03.pdf uploaded by John Doe', time: '2 min ago', tooltip: 'Recent document upload activity' },
    { icon: Tag, text: 'Added "Finance" tag to 5 documents', time: '5 min ago', tooltip: 'Tagging activity' },
    { icon: Search, text: 'OCR completed for contract_draft.pdf', time: '8 min ago', tooltip: 'OCR processing completed' },
    { icon: FileText, text: 'report_Q1.pdf accessed by Jane Smith', time: '12 min ago', tooltip: 'Document access logged' },
    { icon: Upload, text: 'receipt_grocery.jpg uploaded by Mike Wilson', time: '15 min ago', tooltip: 'Recent upload' }
  ];

  const systemHealth = [
    { label: 'Storage Capacity', status: 'healthy', value: 67, tooltip: 'Current storage usage percentage' },
    { label: 'OCR Service', status: 'healthy', icon: CheckCircle, tooltip: 'OCR service is operational' },
    { label: 'Email Integration', status: 'warning', icon: AlertCircle, tooltip: 'There may be issues with email integration' },
    { label: 'Failed Uploads', status: 'error', icon: XCircle, count: 3, tooltip: 'Number of failed uploads requiring attention' }
  ];

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
        {homeDataError ? (
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

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        <div>
          {/* Top Charts */}
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard} title="Breakdown of file types in your system">
              <h3 className={styles.chartTitle}>Document Types</h3>
              <div className={styles.chartPlaceholder}>
                {fileTypeLabels.length > 0 ? (
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

          {/* Bottom Chart */}
          <div className={styles.chartCard} title="Monthly growth of documents uploaded">
            <h3 className={styles.chartTitle}>Document Growth</h3>
            <div className={styles.chartPlaceholder}>
              <LineChart labels={chartLabels} dataPoints={chartValues} />
            </div>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div>
          <h2 className={styles.sectionTitle} title="Quick actions to get started">Quick Actions</h2>
          <div className={styles.actionGrid}>
            {quickActions.map((action, index) => (
              <div
                key={index}
                className={`${styles.actionCard} ${hoveredAction === index ? styles.actionCardHover : ''}`}
                onMouseEnter={() => setHoveredAction(index)}
                onMouseLeave={() => setHoveredAction(null)}
                onClick={action.onClick}
                title={action.tooltip}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    action.onClick();
                  }
                }}
              >
                <action.icon className={styles.actionIcon} aria-hidden="true" />
                <p className={styles.actionText}>{action.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className={styles.bottomGrid}>
        {/* Recent Activity */}
        <div className={styles.card} title="Recent activity in your account">
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <div>
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className={styles.activityItem}
                title={activity.tooltip}
              >
                <activity.icon className={styles.activityIcon} aria-hidden="true" />
                <p className={styles.activityText}>{activity.text}</p>
                <span className={styles.activityTime}>{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className={styles.card} title="Current system health status">
          <h2 className={styles.sectionTitle}>System Health</h2>
          <div>
            {systemHealth.map((item, index) => (
              <div key={index} className={styles.healthItem} title={item.tooltip}>
                <span className={styles.healthLabel}>{item.label}</span>
                <div className={`${styles.healthStatus} ${
                  item.status === 'healthy' ? styles.statusGreen :
                  item.status === 'warning' ? styles.statusYellow :
                  styles.statusRed
                }`}>
                  {item.icon && <item.icon size={12} aria-hidden="true" />}
                  {item.count && <span>{item.count}</span>}
                  {item.value !== undefined && (
                    <div style={{ minWidth: '60px' }}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${item.value}%`,
                            backgroundColor:
                              item.value > 80
                                ? '#dc2626'
                                : item.value > 60
                                  ? '#d97706'
                                  : '#059669'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px' }}>{item.value}%</span>
                    </div>
                  )}
                  {!item.count && item.value === undefined && (
                    <span>
                      {item.status === 'healthy'
                        ? 'Online'
                        : item.status === 'warning'
                          ? 'Warning'
                          : 'Error'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
