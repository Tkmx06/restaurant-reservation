// メールアドレスのドメインから会社名を推定する（顧客名簿の検索・表示用）。
// フリーメール（Gmail等）は個人利用とみなし、会社名の対象外にする。
const PERSONAL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.co.jp', 'yahoo.de', 'hotmail.com', 'outlook.com', 'outlook.de',
  'icloud.com', 'me.com', 'web.de', 'gmx.de', 'gmx.net', 't-online.de', 'live.com', 'live.de',
  'aol.com', 'protonmail.com', 'mail.com',
  // 日本の携帯キャリア系メール
  'docomo.ne.jp', 'ezweb.ne.jp', 'au.com', 'softbank.ne.jp', 'i.softbank.jp',
];

export function extractCompanyDomain(email: string): { domain: string | null; companyName: string | null } {
  const domain = email?.split('@')[1]?.toLowerCase();
  if (!domain || PERSONAL_DOMAINS.includes(domain)) {
    return { domain: null, companyName: null };
  }
  const parts = domain.split('.');
  const name = parts[0];
  const companyName = name
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { domain, companyName };
}
