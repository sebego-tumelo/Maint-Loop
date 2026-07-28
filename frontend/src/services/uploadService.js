const baseUrl = import.meta.env.VITE_LOTTERY_API_BASE_URL || '';

export const uploadFile = async (file, onStateChange) => {
  onStateChange('uploading', file.name);
  // console.log('baseUrl: ', baseUrl);
  const formData = new FormData();
  formData.append('lottoFile', file);
  try {
    const response = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    
    const { jobId } = await response.json();
    pollUploadStatus(jobId, onStateChange);
    
  } catch (error) {
    console.error(error);
    onStateChange('error', 'Upload failed');
  }
};

const pollUploadStatus = (jobId, onStateChange) => {
  const startTime = Date.now();
  const poll = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/upload/status/${jobId}`);
      const data = await response.json();

      if (data.status === 'completed') {
        onStateChange('success', 'File processed successfully');
        return;
      }
      
      if (Date.now() - startTime > 120000) { // 2 minutes
        onStateChange('error', 'Processing timed out');
        return;
      }
      
      setTimeout(poll, 10000);
    } catch (e) {
      if (Date.now() - startTime > 120000) {
        onStateChange('error', 'Processing failed');
      } else {
        setTimeout(poll, 10000);
      }
    }
  };
  poll();
};
