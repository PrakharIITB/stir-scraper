"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Upload } from "lucide-react"

export function FileUpload({ onFileUpload }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!")
      return
    }

    setUploading(true)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("http:localhost:5050/api/upload-hashtags", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result = await response.json()
      onFileUpload(result)
      alert("File uploaded and processed successfully!")
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Error uploading file. Please try again.")
    } finally {
      setUploading(false)
      setFile(null)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Input type="file" accept=".csv" onChange={handleFileChange} className="max-w-xs" />
      <Button onClick={handleUpload} disabled={!file || uploading}>
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : "Upload CSV"}
      </Button>
    </div>
  )
}

