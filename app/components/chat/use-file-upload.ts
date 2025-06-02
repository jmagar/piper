import { useCallback, useState } from "react"

export const useFileUpload = () => {
  const [files, setFiles] = useState<File[]>([])

  const handleFileUpload = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleFileRemove = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file))
  }, [])

  return {
    files,
    setFiles,
    handleFileUpload,
    handleFileRemove,
  }
}
