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


  // Check the structure of data
  console.log("homeNodeData.items", homeNodeData?.items);
  // console.log("Sample document:", homeNodeData?.items?.[0]);


  // === Generate tag distribution data
  const tagCountMap: Record<string, number> = {};
  homeNodeData?.items?.forEach(item => {
    item.tags?.forEach(tag => {
      const tagName = tag.name;
      tagCountMap[tagName] = (tagCountMap[tagName] || 0) + 1;
    });
  });

  const tagLabels = Object.keys(tagCountMap);
  const tagValues = Object.values(tagCountMap);// Utility: format date to 'Jan', 'Feb', etc.
  const getMonthLabel = (dateStr: string) =>
    new Date(dateStr).toLocaleString('default', { month: 'short' });

  // Line Graph
  const monthlyUploadMap: Record<string, number> = {};

  // Populate monthly upload data
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
  // console.log("Chart Labels:", chartLabels);
  // console.log("Chart Values:", chartValues);



  const kpiData = [
    {
      icon: FileText,
      value: homeDataLoading ? '...' : totalDocuments.toString(),
      label: 'Total Documents'
    },
    {
      icon: FolderOpen,
      value: homeDataLoading ? '...' : totalFolders.toString(),
      label: 'Total Folders'
    },
    {
      icon: Tag,
      value: homeDataLoading ? '...' : untaggedDocuments.toString(),
      label: 'Untagged Files'
    },
    {
      icon: Search,
      value: '--',
      label: 'Pending OCR'
    },
    {
      icon: HardDrive,
      value: '-- GB',
      label: 'Storage Used'
    }
  ];

  const quickActions = [
    { icon: Upload, text: 'Upload Document', onClick: () => navigate('/home') },
    { icon: Tag, text: 'Create Tag', onClick: () => navigate('/tags') },
    { icon: Tag, text: 'Create Categories', onClick: () => navigate('/document-types') },
    { icon: FolderOpen, text: 'Import from Folder' },
    { icon: Scan, text: 'Scan from Device' },
    { icon: AlertCircle, text: 'View OCR Errors' }
  ];

  const recentActivity = [
    { icon: Upload, text: 'invoice_2024_03.pdf uploaded by John Doe', time: '2 min ago' },
    { icon: Tag, text: 'Added "Finance" tag to 5 documents', time: '5 min ago' },
    { icon: Search, text: 'OCR completed for contract_draft.pdf', time: '8 min ago' },
    { icon: FileText, text: 'report_Q1.pdf accessed by Jane Smith', time: '12 min ago' },
    { icon: Upload, text: 'receipt_grocery.jpg uploaded by Mike Wilson', time: '15 min ago' }
  ];

  const systemHealth = [
    { label: 'Storage Capacity', status: 'healthy', value: 67 },
    { label: 'OCR Service', status: 'healthy', icon: CheckCircle },
    { label: 'Email Integration', status: 'warning', icon: AlertCircle },
    { label: 'Failed Uploads', status: 'error', icon: XCircle, count: 3 }
  ];

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          Welcome, <span>{currentUser?.username || 'User'}!</span>
        </h1>
        <p className={styles.subtitle}>Document management system overview</p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {homeDataError ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#dc2626' }}>
            Error loading dashboard data
          </div>
        ) : (
          kpiData.map((item, index) => (
            <div key={index} className={styles.kpiCard}>
              <item.icon className={styles.kpiIcon} />
              <h3 className={styles.kpiValue}>{item.value}</h3>
              <p className={styles.kpiLabel}>{item.label}</p>
            </div>
          ))
        )}
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        <div>
          <div className={styles.chartsGrid}>
            {/* <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Document Growth</h3>
              <div className={styles.chartPlaceholder}>
                <LineChart />
              </div>
            </div> */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Document Growth</h3>
              <div className={styles.chartPlaceholder}>
                <LineChart labels={chartLabels} dataPoints={chartValues} />
              </div>
            </div>


            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Tag Distribution</h3>
              <div className={styles.chartPlaceholder}>
                <DoughnutChart labels={tagLabels} values={tagValues} />
              </div>
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Upload Activity by User</h3>
            <div className={styles.chartPlaceholder}>
              <BarChart />
            </div>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.actionGrid}>
            {quickActions.map((action, index) => (
              <div
                key={index}
                className={`${styles.actionCard} ${hoveredAction === index ? styles.actionCardHover : ''}`}
                onMouseEnter={() => setHoveredAction(index)}
                onMouseLeave={() => setHoveredAction(null)}
                onClick={action.onClick}
              >
                <action.icon className={styles.actionIcon} />
                <p className={styles.actionText}>{action.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className={styles.bottomGrid}>
        {/* Recent Activity */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <div>
            {recentActivity.map((activity, index) => (
              <div key={index} className={styles.activityItem}>
                <activity.icon className={styles.activityIcon} />
                <p className={styles.activityText}>{activity.text}</p>
                <span className={styles.activityTime}>{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>System Health</h2>
          <div>
            {systemHealth.map((item, index) => (
              <div key={index} className={styles.healthItem}>
                <span className={styles.healthLabel}>{item.label}</span>
                <div className={`${styles.healthStatus} ${item.status === 'healthy' ? styles.statusGreen :
                  item.status === 'warning' ? styles.statusYellow :
                    styles.statusRed
                  }`}>
                  {item.icon && <item.icon size={12} />}
                  {item.count && <span>{item.count}</span>}
                  {item.value && (
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
                  {!item.count && !item.value && (
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
