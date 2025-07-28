import React, { useState } from "react";
import { X, Eye, Images } from "lucide-react";

interface AdditionalImagesProps {
  images: string[];
  onImageDelete?: (imageUrl: string) => Promise<void>;
  readOnly?: boolean;
}

export default function AdditionalImages({ images, onImageDelete, readOnly = false }: AdditionalImagesProps) {
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  const handleImageDelete = async (imageUrl: string) => {
    if (!onImageDelete) return;

    try {
      setDeletingImage(imageUrl);
      await onImageDelete(imageUrl);
    } catch (error) {
      console.error("Failed to delete image:", error);
      alert("Failed to delete image. Please try again.");
    } finally {
      setDeletingImage(null);
    }
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <>
      {/* View Images Button */}
      <button
        onClick={() => setShowImagesModal(true)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-all duration-200"
      >
        <Images className="h-4 w-4" />
        <span>View Images ({images.length})</span>
      </button>

      {/* Images Modal */}
      {showImagesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowImagesModal(false)}>
          <div className="relative max-w-6xl max-h-screen p-6 bg-white rounded-lg m-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Additional Images ({images.length})</h3>
              <button
                onClick={() => setShowImagesModal(false)}
                className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                    <img src={imageUrl} alt={`Additional ${index + 1}`} className="w-full h-full object-cover" onClick={() => setSelectedImage(imageUrl)} />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  {/* Delete button */}
                  {!readOnly && onImageDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageDelete(imageUrl);
                      }}
                      disabled={deletingImage === imageUrl}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  {/* Loading overlay */}
                  {deletingImage === imageUrl && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full-size Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-7xl max-h-screen p-4">
            <img src={selectedImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
