import { resend } from './resend';

const FROM_EMAIL = 'onboarding@resend.dev';

interface BookingEmailProps {
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  guests: number | string;
  locale?: 'de' | 'en' | 'ja';
}

// 1. 予約確認メール（お客様向け）
export async function sendCustomerConfirmation({
  customerName,
  customerEmail,
  bookingDate,
  guests,
  locale = 'de',
}: BookingEmailProps) {
  const texts = {
    de: {
      subject: '【ご予約完了】 Japanisches Bistro T-style',
      greeting: `Sehr geehrte(r) ${customerName},`,
      intro: 'Wir haben Ihre Reservierung wie folgt erhalten:',
      dateLabel: 'Datum & Uhrzeit',
      guestsLabel: 'Personenanzahl',
      thanks: 'Wir freuen uns auf Ihren Besuch im Japanisches Bistro T-style.',
    },
    en: {
      subject: '【ご予約完了】 Japanisches Bistro T-style',
      greeting: `Dear ${customerName},`,
      intro: 'We have received your reservation with the following details:',
      dateLabel: 'Date & Time',
      guestsLabel: 'Number of guests',
      thanks: 'We look forward to welcoming you to Japanisches Bistro T-style.',
    },
    ja: {
      subject: '【ご予約完了】 Japanisches Bistro T-style',
      greeting: `${customerName} 様`,
      intro: '以下の内容でご予約を承りました。',
      dateLabel: '日時',
      guestsLabel: '人数',
      thanks: 'Japanisches Bistro T-styleへのご来店を心よりお待ちしております。',
    },
    es: {
      subject: '【ご予約完了】 Japanisches Bistro T-style',
      greeting: `Estimado/a ${customerName},`,
      intro: 'Hemos recibido su reserva con los siguientes detalles:',
      dateLabel: 'Fecha y hora',
      guestsLabel: 'Número de personas',
      thanks: 'Esperamos darle la bienvenida en Japanisches Bistro T-style.',
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
      subject: `【新規予約】${customerName}様 (${guests}名)`,
      html: `
        <div>
          <h3>新しい予約が入りました。</h3>
          <ul>
            <li><strong>お客様名:</strong> ${customerName} (${customerEmail})</li>
            <li><strong>人数:</strong> ${guests}</li>
            <li><strong>日時:</strong> ${bookingDate}</li>
          </ul>
        </div>
      `,
    });
  } catch (error) {
    console.error('スタッフ向け通知エラー:', error);
    throw error;
  }
}