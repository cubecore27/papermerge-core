// styles
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

export default function Report() {
  return (
    <div className={styles.reportPage}>
      <div className={styles.rpHeader}>
        <h1 className={styles.title}>Settings and Report</h1>
        <p className={styles.subtitle}>Document management system overview</p>
      </div>

      {/* Document Actions Summary */}
      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Document Actions Summary</h2>
        <div className={styles.statsGrid}>
          <StatCard icon={<FileInput />} label="Files Imported" value="342" color="import" />
          <StatCard icon={<FileOutput />} label="Files Exported" value="89" color="export" />
          <StatCard icon={<Upload />} label="Files Uploaded" value="421" color="upload" />
          <StatCard icon={<Download />} label="Files Downloaded" value="655" color="download" />
          <StatCard icon={<Trash2 />} label="Files Deleted" value="76" color="deleted" />
        </div>
      </section>

      {/* Import/Export File Logs */}
      <section className={styles.logsSection}>
        <h2 className={styles.sectionTitle}>Recent Import/Export Logs</h2>
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>File Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2025-08-14 09:12</td>
              <td>admin</td>
              <td>Import</td>
              <td>Q3_Budget.xlsx</td>
              <td>Success</td>
            </tr>
            <tr>
              <td>2025-08-13 17:23</td>
              <td>john.doe</td>
              <td>Export</td>
              <td>EmployeeList_2025.pdf</td>
              <td>Success</td>
            </tr>
            <tr>
              <td>2025-08-12 14:03</td>
              <td>sarah.l</td>
              <td>Delete</td>
              <td>OutdatedPolicy.docx</td>
              <td>Completed</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* File Type Breakdown */}
      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>File Type Breakdown</h2>
        <div className={styles.statsGrid}>
          <StatCard icon={<FileText />} label="PDFs" value="208" color="pdf" />
          <StatCard icon={<FilePlus />} label="Word Docs" value="165" color="word" />
          <StatCard icon={<FileSpreadsheet />} label="Spreadsheets" value="89" color="excel" />
          <StatCard icon={<FileImage />} label="Images" value="63" color="image" />
        </div>
      </section>

      {/* Export Report Buttons */}
      <section className={styles.exportSection}>
        <h2 className={styles.sectionTitle}>Export Reports</h2>
        <div className={styles.buttonGroup}>
          <button className={styles.exportButton}>Download Full Activity Report (CSV)</button>
          <button className={styles.exportButton}>Download Import/Export Logs (CSV)</button>
        </div>
      </section>
    </div>
  );
}

// Reusable StatCard component
function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className={`${styles.statCard} ${styles[color]}`}>
      <div className={styles.icon}>{icon}</div>
      <h3>{label}</h3>
      <p>{value}</p>
    </div>
  );
}
