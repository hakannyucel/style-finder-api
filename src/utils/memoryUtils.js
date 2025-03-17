/**
 * Utility functions for memory management
 */

// Clean up memory by forcing garbage collection (if available)
const cleanupMemory = () => {
  if (global.gc) {
    try {
      global.gc();
      console.log('Manual garbage collection performed');
    } catch (error) {
      console.error('Failed to force garbage collection:', error);
    }
  }
};

// Check and log memory usage
const logMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();
  const formatMemory = (bytes) => (Math.round(bytes / 1024 / 1024 * 100) / 100) + ' MB';
  
  console.log('Memory usage:');
  console.log('  RSS:', formatMemory(memoryUsage.rss), '- Total memory allocated');
  console.log('  Heap Total:', formatMemory(memoryUsage.heapTotal), '- Total size of heap');
  console.log('  Heap Used:', formatMemory(memoryUsage.heapUsed), '- Actual memory used');
  console.log('  External:', formatMemory(memoryUsage.external), '- Memory used by C++ objects');
  
  return memoryUsage;
};

// Schedule periodic memory cleanup
const scheduleMemoryCleanup = (intervalMs = 30 * 60 * 1000) => {
  const interval = setInterval(() => {
    console.log('Running scheduled memory cleanup');
    logMemoryUsage();
    cleanupMemory();
  }, intervalMs);
  
  return interval;
};

module.exports = {
  cleanupMemory,
  logMemoryUsage,
  scheduleMemoryCleanup
}; 