import React from 'react';
import {
  FileText, Upload, Scan, Tag, FolderOpen, TrendingUp,
  Users, Search, AlertCircle, HardDrive, CheckCircle, XCircle,
  Pi
} from 'lucide-react';

// styles
import styles from './dashboard.module.css'; 

// components
import LineChart from '@/components/Charts/Line';
import DoughnutChart from '@/components/Charts/Doughnut';
import BarChart from '@/components/Charts/Bar';

const Dashboard = () => {
  const [hoveredAction, setHoveredAction] = React.useState(null);

  const kpiData = [
    { icon: FileText, value: '100', label: 'Total Documents' },
    { icon: Upload, value: '15', label: 'New This Month' },
    { icon: HardDrive, value: '100 GB', label: 'Storage Used' },
    { icon: Search, value: '5', label: 'Pending OCR' },
    { icon: Tag, value: '20', label: 'Untagged Files' }
  ];

  const quickActions = [
    { icon: Upload, text: 'Upload Document' },
    { icon: Scan, text: 'Scan from Device' },
    { icon: Tag, text: 'Create Tag/Category' },
    { icon: FolderOpen, text: 'Import from Folder' },
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
        <h1 className={styles.title}>Welcome, <span>Admin!</span></h1>
        <p className={styles.subtitle}>Document management system overview</p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {kpiData.map((item, index) => (
          <div key={index} className={styles.kpiCard}>
            <item.icon className={styles.kpiIcon} />
            <h3 className={styles.kpiValue}>{item.value}</h3>
            <p className={styles.kpiLabel}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        <div>
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Document Growth</h3>
              <div className={styles.chartPlaceholder}>
                {/* <TrendingUp size={24} style={{ marginRight: '8px' }} />
                📈 Line Chart - Uploads over time */}
                <LineChart />
              </div>
            </div>

            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Tag Distribution</h3>
              <div className={styles.chartPlaceholder}>
                {/* 🥧 Pie Chart - Most used tags */}
                <DoughnutChart />
              </div>
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Upload Activity by User</h3>
            <div className={styles.chartPlaceholder}>
              {/* <Users size={24} style={{ marginRight: '8px' }} />
              📊 Bar Chart - User activity comparison */}
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
                <div className={`${styles.healthStatus} ${
                  item.status === 'healthy'
                    ? styles.statusGreen
                    : item.status === 'warning'
                    ? styles.statusYellow
                    : styles.statusRed
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
