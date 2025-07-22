import React from "react";
import { parseFile } from "../../utils/fileParser.ts";
import type { ParsedSIM } from "../../types/index.ts";

interface FileUploadProps {
  onUpload: (iccids: ParsedSIM[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const iccids = await parseFile(file);
      onUpload(iccids);
      console.log(iccids);
    }
  };

  return (
    <div className="my-4">
      <input type="file" accept=".csv,.xlsx,.txt" onChange={handleFileChange} />
    </div>
  );
};

export default FileUpload;
