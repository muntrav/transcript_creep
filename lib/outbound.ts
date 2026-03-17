import dns from 'node:dns/promises'
import net from 'node:net'

const ALLOWED_MEDIA_HOSTS = [
  'googlevideo.com',
  'gvt1.com',
  'ytimg.com',
  'youtube.com',
  'youtu.be',
  'fbcdn.net',
  'cdninstagram.com',
  'instagram.com',
  'tiktokcdn.com',
  'byteoversea.com',
  'ibyteimg.com',
  'ibytedtos.com',
  'muscdn.com',
  'tiktok.com',
]

function isAllowedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return ALLOWED_MEDIA_HOSTS.some((host) => normalized === host || normalized.endsWith(`.${host}`))
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true

  if (parts[0] === 10) return true
  if (parts[0] === 127) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  return false
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  )
}

function isPrivateAddress(ip: string): boolean {
  const family = net.isIP(ip)
  if (family === 4) return isPrivateIpv4(ip)
  if (family === 6) return isPrivateIpv6(ip)
  return true
}

export async function assertSafeOutboundMediaUrl(value: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Resolved media URL is invalid')
  }

  if (url.protocol !== 'https:') {
    throw new Error('Resolved media URL must use HTTPS')
  }

  if (!isAllowedHostname(url.hostname)) {
    throw new Error('Resolved media host is not allowed')
  }

  const records = await dns.lookup(url.hostname, { all: true })
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error('Resolved media host is not reachable safely')
  }

  return url
}
