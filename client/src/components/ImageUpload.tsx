import React, { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, Plus } from "lucide-react";

interface ImageUploadProps {
  onImageUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  currentImageUrl?: string;
  onImageDelete?: () => Promise<void>;
  type?: "profile" | "additional";
  size?: "sm" | "md" | "lg";
}

export default function ImageUpload({ onImageUpload, isUploading = false, currentImageUrl, onImageDelete, type = "profile", size = "md" }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    try {
      await onImageUpload(file);
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Image upload failed. Please try again.");
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    if (onImageDelete) {
      try {
        await onImageDelete();
      } catch (error) {
        console.error("Image deletion failed:", error);
        alert("Image deletion failed. Please try again.");
      }
    }
  };

  if (type === "profile") {
    return (
      <div className="relative group">
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-gray-200 overflow-hidden relative ${dragOver ? "border-blue-400 bg-blue-50" : ""} ${
            isUploading ? "opacity-50" : ""
          } ${currentImageUrl ? "cursor-default" : "cursor-pointer"}`}
          onClick={!isUploading && !currentImageUrl ? handleClick : undefined}
          onDrop={!currentImageUrl ? handleDrop : undefined}
          onDragOver={!currentImageUrl ? handleDragOver : undefined}
          onDragLeave={!currentImageUrl ? handleDragLeave : undefined}
        >
          {currentImageUrl ? (
            <img src={currentImageUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              {isUploading ? <Loader2 className="h-4 w-4 text-gray-500 animate-spin" /> : <Camera className="h-4 w-4 text-gray-500" />}
            </div>
          )}
        </div>

        {/* No delete button - profile image is permanent once set */}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={!!currentImageUrl} // Disable if image already exists
        />
      </div>
    );
  }

  // Additional image upload button
  return (
    <button
      onClick={handleClick}
      disabled={isUploading}
      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 disabled:opacity-50"
    >
      {isUploading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading...</span>
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          <span>Add Images</span>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach((file) => handleFileSelect(file));
        }}
        className="hidden"
      />
    </button>
  );
}
