import { resend } from './resend';

const FROM_EMAIL = 'onboarding@resend.dev'; 

interface BookingEmailProps {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingDate: string;
}

// 1. 予約確認メール（お客様向け）
export async function sendCustomerConfirmation({
  customerName,
  customerEmail,
  serviceName,
  bookingDate,
}: BookingEmailProps) {
  try {
    await resend.emails.send({
      from: `予約システム <${FROM_EMAIL}>`,
      to: [customerEmail],
      subject: `【ご予約完了】${serviceName}のご予約ありがとうございます`,
      html: `
        <div>
          <h2>${customerName} 様</h2>
          <p>以下の内容でご予約を承りました。</p>
          <ul>
            <li><strong>サービス:</strong> ${serviceName}</li>
            <li><strong>日時:</strong> ${bookingDate}</li>
          </ul>
          <p>ご来店を心よりお待ちしております。</p>
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
  serviceName,
  bookingDate,
}: BookingEmailProps) {
  const STAFF_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || 'staff@example.com';

  try {
    await resend.emails.send({
      from: `予約通知システム <${FROM_EMAIL}>`,
      to: [STAFF_EMAIL],
      subject: `【新規予約】${customerName}様からご予約が入りました`,
      html: `
        <div>
          <h3>新しい予約が入りました。</h3>
          <ul>
            <li><strong>お客様名:</strong> ${customerName} (${customerEmail})</li>
            <li><strong>サービス:</strong> ${serviceName}</li>
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

// 3. リマインダーメール
export async function sendReminderEmail({
  customerName,
  customerEmail,
  serviceName,
  bookingDate,
}: BookingEmailProps) {
  try {
    await resend.emails.send({
      from: `予約リマインダー <${FROM_EMAIL}>`,
      to: [customerEmail],
      subject: `【リマインダー】明日ご予約の予定となっております`,
      html: `
        <div>
          <h2>${customerName} 様</h2>
          <p>明日、以下のご予約予定となっておりますのでお知らせいたします。</p>
          <ul>
            <li><strong>サービス:</strong> ${serviceName}</li>
            <li><strong>日時:</strong> ${bookingDate}</li>
          </ul>
          <p>お気をつけてお越しください。</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('リマインダーメール送信エラー:', error);
    throw error;
  }
}