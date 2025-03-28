/**
 * Utility to play alert sounds in the application
 */

/**
 * Plays a notification sound for driver ride requests
 */
export function playRideRequestSound() {
  // Create audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create oscillator for the alert sound
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // Configure oscillator
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(580, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(780, audioContext.currentTime + 0.2);
  oscillator.frequency.exponentialRampToValueAtTime(580, audioContext.currentTime + 0.4);
  
  // Configure volume
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
  
  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Play sound
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.4);
  
  // Play a second beep after a short pause
  setTimeout(() => {
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    // Configure second oscillator
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(680, audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
    oscillator2.frequency.exponentialRampToValueAtTime(680, audioContext.currentTime + 0.4);
    
    // Configure volume
    gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode2.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
    gainNode2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
    
    // Connect nodes
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    // Play sound
    oscillator2.start();
    oscillator2.stop(audioContext.currentTime + 0.4);
  }, 500);
}