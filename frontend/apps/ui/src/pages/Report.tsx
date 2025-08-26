import React from 'react';
import styles from './report.module.css';

// Lucide Icons
import {
  FileInput,
  FileOutput,
  Upload,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  FilePlus
} from 'lucide-react';

// Redux & API
import { useGetPaginatedNodesQuery } from '@/features/nodes/apiSlice';
import { useAppSelector } from '@/app/hooks';
import { selectCurrentUser } from '@/slices/currentUser';

// Chart (optional)
import DoughnutChart from '@/components/Charts/Doughnut';

export default function Report() {
  const currentUser = useAppSelector(selectCurrentUser);

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

  // === Stats
  const files = homeNodeData?.items || [];
  const uploadedCount = files.filter(f => f.ctype === 'document').length;
  const deletedCount = 76; // mock
  const downloadedCount = 655; // mock

  // === File Type Breakdown
  const fileTypeMap: Record<string, number> = {};

  files.forEach(file => {
    if (file.ctype === 'document' && file.title) {
      const match = file.title.match(/\.(\w+)$/);
      if (match && match[1]) {
        const ext = match[1].toLowerCase();
        fileTypeMap[ext] = (fileTypeMap[ext] || 0) + 1;
      }
    }
  });

  const typeLabels = Object.keys(fileTypeMap);
  const typeValues = Object.values(fileTypeMap);

  // === Logs (mock for now)
  const recentLogs = [
    {
      timestamp: '2025-08-14 09:12',
      user: 'admin',
      action: 'Import',
      file: 'Q3_Budget.xlsx',
      status: 'Success'
    },
    {
      timestamp: '2025-08-13 17:23',
      user: 'john.doe',
      action: 'Export',
      file: 'EmployeeList_2025.pdf',
      status: 'Success'
    },
    {
      timestamp: '2025-08-12 14:03',
      user: 'sarah.l',
      action: 'Delete',
      file: 'OutdatedPolicy.docx',
      status: 'Completed'
    }
  ];

  if (isLoading) return <div className={styles.reportPage}>Loading report...</div>;
  if (error) return <div className={styles.reportPage}>Error loading report.</div>;

  return (
    <div className={styles.reportPage}>
      {/* Header with Download Button */}
      <div className={styles.headerContent}>
        <div>
          <h1 className={styles.title} title="Overview of document system usage and settings">Settings and Report</h1>
          <p className={styles.subtitle}>Document management system overview</p>
        </div>
        <div className={styles.buttonGroup}>
          <button
            className={styles.exportButton}
            title="Download a complete CSV report of all documents and actions"
          >
            <Download size={16} />
            Download Full Report (CSV)
          </button>
        </div>
      </div>

      {/* Document Actions Summary */}
      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle} title="Summary of how many files have been uploaded, downloaded, and deleted">
          Document Actions Summary
        </h2>
        <div className={styles.statsGrid}>
          <StatCard
            icon={<Upload title="Files uploaded by users" />}
            label="Files Uploaded"
            value={uploadedCount.toString()}
            color="upload"
          />
          <StatCard
            icon={<Download title="Files downloaded by users" />}
            label="Files Downloaded"
            value={downloadedCount.toString()}
            color="download"
          />
          <StatCard
            icon={<Trash2 title="Files removed or deleted" />}
            label="Files Deleted"
            value={deletedCount.toString()}
            color="deleted"
          />
        </div>
      </section>

      {/* Import/Export Logs */}
      <section className={styles.logsSection}>
        <h2 className={styles.sectionTitle} title="List of recent import/export actions performed by users">
          Recent Import/Export Logs
        </h2>
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
            {recentLogs.map((log, idx) => (
              <tr key={idx}>
                <td>{log.timestamp}</td>
                <td>{log.user}</td>
                <td>{log.action}</td>
                <td>{log.file}</td>
                <td>{log.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* File Type Breakdown */}
      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle} title="Breakdown of file types uploaded by users">
          File Type Breakdown
        </h2>
        <div className={styles.chartGrid}>
          <div className={styles.statsGrid}>
            {Object.entries(fileTypeMap).map(([ext, count], idx) => {
              let icon = <FileText title="Generic document file" />;
              let color = 'pdf';

              if (['doc', 'docx'].includes(ext)) {
                icon = <FilePlus title="Microsoft Word document" />;
                color = 'word';
              } else if (['xls', 'xlsx'].includes(ext)) {
                icon = <FileSpreadsheet title="Excel spreadsheet" />;
                color = 'excel';
              } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
                icon = <FileImage title="Image file" />;
                color = 'image';
              }

              return (
                <StatCard
                  key={idx}
                  icon={icon}
                  label={ext.toUpperCase()}
                  value={count.toString()}
                  color={color}
                />
              );
            })}
          </div>

          {/* Optional: Chart */}
          {typeLabels.length > 0 && (
            <div className={styles.chartContainer} title="Visual representation of file types">
              <DoughnutChart labels={typeLabels} values={typeValues} />
            </div>
          )}
        </div>
      </section>

      {/* Export Buttons */}
      <section className={styles.exportSection}>
        <div className={styles.buttonGroup}>
          <button
            className={styles.exportButton}
            title="Download CSV file with all system activity"
          >
            <Download size={16} />
            Download Full Activity Report (CSV)
          </button>
          <button
            className={styles.exportButton}
            title="Download only the import/export logs in CSV format"
          >
            <Download size={16} />
            Download Import/Export Logs (CSV)
          </button>
        </div>
      </section>
    </div>
  );
}

// === StatCard Component ===
function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className={`${styles.statCard} ${styles[color]}`}
      title={`${label}: ${value}`}
    >
      <div className={styles.icon}>{icon}</div>
      <h3>{label}</h3>
      <p>{value}</p>
    </div>
  );
}
