/**
 * Triggers a browser download for a raw blob response.
 * @param {Blob} blob - The file blob data
 * @param {string} filename - The default name to save the file as
 */
export const downloadBlob = (blob, filename) => {
  if (!blob) {
    console.error('[downloadBlob] No blob content provided for download');
    return;
  }
  try {
    // Create direct Object URL from the blob content
    const url = window.URL.createObjectURL(new Blob([blob], { type: blob.type || 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup reference after small delay
    setTimeout(() => {
      link.remove();
      window.URL.revokeObjectURL(url);
    }, 150);
  } catch (err) {
    console.error('[downloadBlob] Error executing browser file download:', err);
  }
};
