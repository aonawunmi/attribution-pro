import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Reusable CSV file uploader with drag-and-drop support.
 *
 * @param {Object} props
 * @param {string} props.label           - Upload area label
 * @param {string} [props.description]   - Help text
 * @param {(file: File) => Promise<void>} props.onFileSelected - Callback when file is selected
 * @param {string[]} [props.errors]      - Parse/validation errors to display
 * @param {boolean} [props.success]      - Show success state
 */
export default function CsvUploader({ label, description, onFileSelected, errors = [], success = false }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      return;
    }
    setFileName(file.name);
    await onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : success
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {success ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        ) : (
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        )}
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        {fileName && (
          <p className="text-xs text-blue-600 mt-2 flex items-center justify-center gap-1">
            <FileText className="w-3 h-3" /> {fileName}
          </p>
        )}
      </div>

      {errors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
