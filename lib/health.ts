export function getHealth() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }
}
