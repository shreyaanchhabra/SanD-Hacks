const APPROVED_HOSTS = new Set(['www.usa.gov', 'usa.gov', 'www.india.gov.in', 'india.gov.in']);
const PRIVATE_HOSTS = new Set(['localhost', 'localhost.localdomain']);

export const APPROVED_SOURCES = [
  {
    category: 'us-benefits',
    url: 'https://www.usa.gov/benefits/',
  },
  {
    category: 'india-portal',
    url: 'https://www.india.gov.in/',
  },
];

export function validateApprovedUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Source URL must be absolute.');
  }

  if (url.protocol !== 'https:') throw new Error('Only HTTPS public sources are allowed.');
  if (url.username || url.password) throw new Error('Source URLs must not contain credentials.');
  if (PRIVATE_HOSTS.has(url.hostname) || isIpAddress(url.hostname)) {
    throw new Error('Private, local, and IP-address sources are not allowed.');
  }
  if (!APPROVED_HOSTS.has(url.hostname)) throw new Error(`Source host is not approved: ${url.hostname}`);
  return url;
}

export function assertApprovedRedirect(value) {
  return validateApprovedUrl(value);
}

function isIpAddress(hostname) {
  return hostname.includes(':') || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}
