import React, { useState } from 'react';
import { Worker } from '@react-pdf-viewer/core';
import { Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { searchPlugin } from '@react-pdf-viewer/search';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';

interface PDFViewerProps {
  fileUrl: string;
  onClose: () => void;
  title?: string;
}

export default function PDFViewer({ fileUrl, onClose, title }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Create plugins
  const searchPluginInstance = searchPlugin({
    keyword: [''], // Empty initial search
  });
  
const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [],
    renderToolbar: (Toolbar) => (
        <Toolbar>
            {(slots) => {
                const {
                    ZoomIn,
                    ZoomOut,
                    Search,
                    GoToNextPage,
                    GoToPreviousPage,
                    CurrentPageInput,
                    NumberOfPages,
                } = slots;
                return (
                    <>
                        <div style={{ padding: '0 2px' }}>
                            <ZoomOut />
                        </div>
                        <div style={{ padding: '0 2px' }}>
                            <ZoomIn />
                        </div>
<div style={{ padding: '0 2px' }}>
    {/* Import Search from searchPluginInstance */}
    <Search>
        {(renderSearchProps) => (
            <>
                <input
                    type="text"
                    value={renderSearchProps.keyword}
                    onChange={(e) => renderSearchProps.setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && renderSearchProps.search()}
                    placeholder="Search…"
                    style={{ marginRight: '4px' }}
                />
                <button onClick={renderSearchProps.search}>Search</button>
                <button
                    onClick={renderSearchProps.jumpToPreviousMatch}
                    disabled={renderSearchProps.currentMatch <= 0}
                >
                    Prev
                </button>
                <button
                    onClick={renderSearchProps.jumpToNextMatch}
                    disabled={false}
                >
                    Next
                </button>
            </>
        )}
    </Search>
</div>

                        <div style={{ padding: '0 2px' }}>
                            <GoToPreviousPage />
                        </div>
                        <div style={{ padding: '0 2px' }}>
                            <CurrentPageInput /> / <NumberOfPages />
                        </div>
                        <div style={{ padding: '0 2px' }}>
                            <GoToNextPage />
                        </div>
                    </>
                );
            }}
        </Toolbar>
    ),
});


  const handleDocumentLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {title || 'PDF Viewer'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}
          
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <div style={{ height: '600px' }}>
              <Viewer
                    fileUrl={fileUrl}
                    plugins={[defaultLayoutPluginInstance, searchPluginInstance]}
                    onDocumentLoad={handleDocumentLoad}
                    defaultScale={SpecialZoomLevel.PageWidth}
                />

            </div>
          </Worker>
        </div>
      </div>
    </div>
  );
}
