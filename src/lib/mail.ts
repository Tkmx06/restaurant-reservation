import { resend } from './resend';

const FROM_EMAIL = 'reservation@t-style-de.com';
const MENU_URL = 'https://t-stylefrankfurt.my.canva.site/';

// "2026-08-25 18:00" のような文字列を "8月25日 18:00" に変換（スタッフ向け通知の件名用、年は省略）
function formatJapaneseDateTime(bookingDate: string): string {
  const [datePart, timePart] = bookingDate.split(' ');
  const dateMatch = datePart?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return bookingDate;
  const [, , m, d] = dateMatch;
  const timeShort = timePart ? timePart.slice(0, 5) : '';
  return `${Number(m)}月${Number(d)}日${timeShort ? `　${timeShort}` : ''}`;
}

interface BookingEmailProps {
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  guests: number | string;
  locale?: 'de' | 'en' | 'ja';
  cancelUrl?: string;
}

// 1. 予約確認メール（お客様向け）
export async function sendCustomerConfirmation({
  customerName,
  customerEmail,
  bookingDate,
  guests,
  locale = 'de',
  cancelUrl,
}: BookingEmailProps) {
  const texts = {
    de: {
      subject: 'Reservierungsbestätigung',
      greeting: `Sehr geehrte(r) ${customerName},`,
      intro: 'Wir haben Ihre Reservierung wie folgt erhalten:',
      dateLabel: 'Datum & Uhrzeit',
      guestsLabel: 'Personenanzahl',
      thanks: 'Wir freuen uns auf Ihren Besuch im Japanisches Bistro T-style.',
      menuText: 'Unsere Speisekarte finden Sie hier:',
      menuLink: 'Zur Speisekarte',
      cancelText: 'Falls Sie Ihre Reservierung stornieren müssen, klicken Sie bitte auf den folgenden Link:',
      cancelLink: 'Reservierung stornieren',
    },
    en: {
      subject: 'Reservation Confirmation',
      greeting: `Dear ${customerName},`,
      intro: 'We have received your reservation with the following details:',
      dateLabel: 'Date & Time',
      guestsLabel: 'Number of guests',
      thanks: 'We look forward to welcoming you to Japanisches Bistro T-style.',
      menuText: 'You can view our menu here:',
      menuLink: 'View menu',
      cancelText: 'If you need to cancel your reservation, please click the link below:',
      cancelLink: 'Cancel reservation',
    },
    ja: {
      subject: '【ご予約完了】',
      greeting: `${customerName} 様`,
      intro: '以下の内容でご予約を承りました。',
      dateLabel: '日時',
      guestsLabel: '人数',
      thanks: 'Japanisches Bistro T-styleへのご来店を心よりお待ちしております。',
      menuText: 'メニューはこちらからご覧いただけます。',
      menuLink: 'メニューを見る',
      cancelText: 'ご予約をキャンセルされる場合は、以下のリンクよりお手続きください。',
      cancelLink: 'ご予約をキャンセルする',
    },
    es: {
      subject: 'Confirmación de reserva',
      greeting: `Estimado/a ${customerName},`,
      intro: 'Hemos recibido su reserva con los siguientes detalles:',
      dateLabel: 'Fecha y hora',
      guestsLabel: 'Número de personas',
      thanks: 'Esperamos darle la bienvenida en Japanisches Bistro T-style.',
      menuText: 'Puede consultar nuestra carta aquí:',
      menuLink: 'Ver la carta',
      cancelText: 'Si necesita cancelar su reserva, haga clic en el siguiente enlace:',
      cancelLink: 'Cancelar reserva',
    }
  };

  const t = texts[locale as keyof typeof texts] || texts.de;

  try {
    await resend.emails.send({
      from: `Japanisches Bistro T-style <${FROM_EMAIL}>`,
      to: [customerEmail],
      subject: t.subject,
      html: `
        <div>
          <h2>${t.greeting}</h2>
          <p>${t.intro}</p>
          <ul>
            <li><strong>${t.dateLabel}:</strong> ${bookingDate}</li>
            <li><strong>${t.guestsLabel}:</strong> ${guests}</li>
          </ul>
          <p>${t.thanks}</p>
          <p style="margin-top: 16px;">
            ${t.menuText}<br />
            <a href="${MENU_URL}" style="color: #1d4ed8;">${t.menuLink}</a>
          </p>
          ${cancelUrl ? `
          <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #555;">
            ${t.cancelText}<br />
            <a href="${cancelUrl}" style="color: #b91c1c;">${t.cancelLink}</a>
          </p>` : ''}
        </div>
      `,
    });
  } catch (error) {
    console.error('お客様向けメール送信エラー:', error);
    throw error;
  }
}

// 2. 従業員への通知メール（スタッフ向け）
export async function sendStaffNotification({
  customerName,
  customerEmail,
  bookingDate,
  guests,
}: BookingEmailProps) {
  const STAFF_EMAIL = 'taka01234567890@gmail.com';
  try {
    await resend.emails.send({
      from: `予約通知システム <${FROM_EMAIL}>`,
      to: [STAFF_EMAIL],
      subject: `${formatJapaneseDateTime(bookingDate)}　${guests}名`,
      html: `
        <div>
          <p style="margin: 4px 0;">【新規予約】${customerName}</p>
          <p style="margin: 4px 0;">${bookingDate}</p>
          <p style="margin: 4px 0;">${customerEmail}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('スタッフ向け通知エラー:', error);
    throw error;
  }
}

// 3b. 日次QAチェックで異常を検知した際のアラートメール
export async function sendQaAlertEmail({
  toEmail,
  failures,
  checkedAt,
}: {
  toEmail: string;
  failures: { name: string; detail: string }[];
  checkedAt: string;
}) {
  try {
    await resend.emails.send({
      from: `予約システム QAチェック <${FROM_EMAIL}>`,
      to: [toEmail],
      subject: `⚠️ 予約システムQAチェックで異常を検知（${failures.length}件）`,
      html: `
        <div>
          <p style="margin: 4px 0;">${checkedAt} の自動チェックで、想定と異なる挙動が見つかりました。</p>
          <ul>
            ${failures.map((f) => `<li style="margin: 8px 0;"><strong>${f.name}</strong><br/><span style="color:#555;">${f.detail}</span></li>`).join('')}
          </ul>
          <p style="margin-top: 16px; color: #888; font-size: 12px;">このメールは /api/cron/qa-check からの自動送信です。</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('QAアラートメール送信エラー:', error);
    throw error;
  }
}

// 3. お客様によるキャンセル発生時の通知メール（スタッフ向け）
export async function sendCancellationStaffNotification({
  customerName,
  customerEmail,
  bookingDate,
  guests,
}: BookingEmailProps) {
  const STAFF_EMAIL = 'taka01234567890@gmail.com';
  try {
    await resend.emails.send({
      from: `予約通知システム <${FROM_EMAIL}>`,
      to: [STAFF_EMAIL],
      subject: `✕ ${formatJapaneseDateTime(bookingDate)}　${guests}名`,
      html: `
        <div>
          <p style="margin: 4px 0;">【キャンセル】${customerName}</p>
          <p style="margin: 4px 0;">${bookingDate}</p>
          <p style="margin: 4px 0;">${customerEmail}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('キャンセル通知エラー:', error);
    throw error;
  }
}

// 4. 来店リマインダーメール（お客様向け）
export async function sendReminderEmail({
  customerName,
  customerEmail,
  bookingDate,
  guests,
  locale = 'de',
  cancelUrl,
}: BookingEmailProps) {
  const texts = {
    de: {
      subject: 'Erinnerung an Ihre Reservierung',
      greeting: `Sehr geehrte(r) ${customerName},`,
      intro: 'Wir möchten Sie an Ihre bevorstehende Reservierung erinnern:',
      dateLabel: 'Datum & Uhrzeit',
      guestsLabel: 'Personenanzahl',
      thanks: 'Wir freuen uns auf Ihren Besuch im Japanisches Bistro T-style.',
      menuText: 'Unsere Speisekarte finden Sie hier:',
      menuLink: 'Zur Speisekarte',
      cancelText: 'Falls Sie Ihre Reservierung stornieren müssen, klicken Sie bitte auf den folgenden Link:',
      cancelLink: 'Reservierung stornieren',
    },
    en: {
      subject: 'Reminder: Your upcoming reservation',
      greeting: `Dear ${customerName},`,
      intro: 'This is a reminder of your upcoming reservation:',
      dateLabel: 'Date & Time',
      guestsLabel: 'Number of guests',
      thanks: 'We look forward to welcoming you to Japanisches Bistro T-style.',
      menuText: 'You can view our menu here:',
      menuLink: 'View menu',
      cancelText: 'If you need to cancel your reservation, please click the link below:',
      cancelLink: 'Cancel reservation',
    },
    ja: {
      subject: '【ご予約のリマインダー】',
      greeting: `${customerName} 様`,
      intro: 'まもなくご予約のお時間です。ご予約内容をご確認ください。',
      dateLabel: '日時',
      guestsLabel: '人数',
      thanks: 'Japanisches Bistro T-styleへのご来店を心よりお待ちしております。',
      menuText: 'メニューはこちらからご覧いただけます。',
      menuLink: 'メニューを見る',
      cancelText: 'ご予約をキャンセルされる場合は、以下のリンクよりお手続きください。',
      cancelLink: 'ご予約をキャンセルする',
    },
  };

  const t = texts[locale as keyof typeof texts] || texts.de;

  try {
    await resend.emails.send({
      from: `Japanisches Bistro T-style <${FROM_EMAIL}>`,
      to: [customerEmail],
      subject: t.subject,
      html: `
        <div>
          <h2>${t.greeting}</h2>
          <p>${t.intro}</p>
          <ul>
            <li><strong>${t.dateLabel}:</strong> ${bookingDate}</li>
            <li><strong>${t.guestsLabel}:</strong> ${guests}</li>
          </ul>
          <p>${t.thanks}</p>
          <p style="margin-top: 16px;">
            ${t.menuText}<br />
            <a href="${MENU_URL}" style="color: #1d4ed8;">${t.menuLink}</a>
          </p>
          ${cancelUrl ? `
          <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #555;">
            ${t.cancelText}<br />
            <a href="${cancelUrl}" style="color: #b91c1c;">${t.cancelLink}</a>
          </p>` : ''}
        </div>
      `,
    });
  } catch (error) {
    console.error('リマインダーメール送信エラー:', error);
    throw error;
  }
}