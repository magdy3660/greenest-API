const axios = require('axios');

class DetectionService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async analyzeImageFromPath(image_url) {
    let retries = 0;
    console.log("[+] sending req to flask")
    try {
      const response = await axios.post(process.env.FLASK_API_URL, {image_url}, {timeout: 60000});
      const scanResults = response.data;
      if (scanResults){console.log("[+] scan successful")}
      // Extract plant name from disease string
      const plantName = scanResults.disease.split('_')[0];
      
      // Format disease name for user readability
      const diseaseFormatted = this.extractDiseaseName(scanResults.disease);
      
      const isHealthy = scanResults.disease.toLowerCase().includes('healthy');
      const plantHealth = isHealthy ? 'healthy' : 'diseased';
      return {
        success:true,
        disease: diseaseFormatted,
        confidence: scanResults.confidence,
        plantName,
        plantHealth
      }
    } catch (err) {
      if (err.status === 400) {
        const error = new Error('Detection failed, No leaf detected in the image');
        error.status = 400;
        error.data = err.response?.data;
        throw error;
      } 
      
      else {
        const error = new Error(err.response?.message || err.message || 'Detection failed');
        error.status =  500;
        throw error;
      }
    }
  }
  
  extractDiseaseName(diseaseString) {
    // Handle case where disease string might be empty or undefined
    if (!diseaseString) return '';
    
    // Replace underscores with spaces
    let formatted = diseaseString.replace(/_/g, ' ');
    
    // Clean up extra spaces
    formatted = formatted.replace(/\s+/g, ' ').trim();
    
    // Handle the "healthy" case
    if (formatted.toLowerCase().includes('healthy')) {
      const plantName = formatted.split(' healthy')[0].trim();
      return `${plantName} (Healthy)`;
    }
    
    // Split into components
    const components = formatted.split(' ');
    
    // Extract plant name (usually the first component)
    let plantName = components[0];
    
    // Handle cases with parentheses like "Corn (maize)"
    if (components.length > 1 && components[1].startsWith('(')) {
      plantName += ' ' + components[1];
    }
    
    // Extract disease name (everything after plant name)
    const diseaseStartIndex = plantName.includes('(') ? 2 : 1;
    let diseaseName = components.slice(diseaseStartIndex).join(' ');
    
    // Capitalize words
    plantName = this.capitalizeWords(plantName);
    diseaseName = this.capitalizeWords(diseaseName);
    
    // Check if disease name already contains plant name to avoid duplication
    if (diseaseName.toLowerCase().includes(plantName.toLowerCase())) {
      return diseaseName; // Just return disease name if it already includes plant name
    }
    
    return `${plantName} - ${diseaseName}`;
  }
  
  // Helper for capitalizing words
  capitalizeWords(text) {
    return text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
}

module.exports = new DetectionService();
