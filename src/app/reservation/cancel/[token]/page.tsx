'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type Lang = 'ja' | 'de' | 'en';

const texts: Record<Lang, {
  title: string;
  loading: string;
  notFound: string;
  dateLabel: string;
  guestsLabel: string;
  person: string;
  confirmMsg: string;
  cancelButton: string;
  cancelling: string;
  cancelledTitle: string;
  cancelledMsg: string;
  alreadyCancelledMsg: string;
  errorMsg: string;
}> = {
  ja: {
    title: 'ご予約のキャンセル',
    loading: '読み込み中...',
    notFound: '該当する予約が見つかりませんでした。',
    dateLabel: '日時',
    guestsLabel: '人数',
    person: '名',
    confirmMsg: '以下のご予約をキャンセルします。よろしいですか？',
    cancelButton: 'この予約をキャンセルする',
    cancelling: '処理中...',
    cancelledTitle: 'キャンセルが完了しました',
    cancelledMsg: 'またのご利用を心よりお待ちしております。',
    alreadyCancelledMsg: 'この予約はすでにキャンセル済みです。',
    errorMsg: 'キャンセル処理に失敗しました。恐れ入りますが、お電話にてご連絡ください。',
  },
  de: {
    title: 'Reservierung stornieren',
    loading: 'Wird geladen...',
    notFound: 'Die Reservierung wurde nicht gefunden.',
    dateLabel: 'Datum & Uhrzeit',
    guestsLabel: 'Personenanzahl',
    person: 'Pers.',
    confirmMsg: 'Möchten Sie folgende Reservierung wirklich stornieren?',
    cancelButton: 'Reservierung stornieren',
    cancelling: 'Wird bearbeitet...',
    cancelledTitle: 'Stornierung abgeschlossen',
    cancelledMsg: 'Wir würden uns freuen, Sie ein anderes Mal begrüßen zu dürfen.',
    alreadyCancelledMsg: 'Diese Reservierung wurde bereits storniert.',
    errorMsg: 'Die Stornierung ist fehlgeschlagen. Bitte kontaktieren Sie uns telefonisch.',
  },
  en: {
    title: 'Cancel Reservation',
    loading: 'Loading...',
    notFound: 'This reservation could not be found.',
    dateLabel: 'Date & Time',
    guestsLabel: 'Number of guests',
    person: 'guests',
    confirmMsg: 'Are you sure you want to cancel the following reservation?',
    cancelButton: 'Cancel this reservation',
    cancelling: 'Processing...',
    cancelledTitle: 'Cancellation complete',
    cancelledMsg: 'We hope to welcome you another time.',
    alreadyCancelledMsg: 'This reservation has already been cancelled.',
    errorMsg: 'Cancellation failed. Please contact us by phone.',
  },
};

interface ReservationInfo {
  id: string;
  guest_name: string;
  date: string;
  time: string;
  guests: number;
  status: string;
}

export default function CancelReservationPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const lang: Lang = (['ja', 'de', 'en'].includes(searchParams.get('locale') || '')
    ? searchParams.get('locale')
    : 'de') as Lang;
  const t = texts[lang];

  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`/api/reservations/cancel/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setReservation(data.reservation);
        if (data.reservation.status === 'cancelled') setCancelled(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.token]);

  const handleCancel = async () => {
    setCancelling(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/reservations/cancel/${params.token}`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setCancelled(true);
    } catch {
      setErrorMsg(t.errorMsg);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h1 className="text-lg font-bold text-slate-900 mb-4">{t.title}</h1>

        {loading && <p className="text-sm text-slate-500">{t.loading}</p>}

        {!loading && notFound && (
          <p className="text-sm text-rose-600">{t.notFound}</p>
        )}

        {!loading && !notFound && reservation && (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">{t.dateLabel}</span>
                <span className="font-bold text-slate-900">{reservation.date} {reservation.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t.guestsLabel}</span>
                <span className="font-bold text-slate-900">{reservation.guests} {t.person}</span>
              </div>
            </div>

            {cancelled ? (
              <div className="text-center py-2">
                <p className="text-emerald-600 font-bold mb-1">{t.cancelledTitle}</p>
                <p className="text-sm text-slate-500">{t.cancelledMsg}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600 mb-4">{t.confirmMsg}</p>
                {errorMsg && <p className="text-sm text-rose-600 mb-3">{errorMsg}</p>}
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition"
                >
                  {cancelling ? t.cancelling : t.cancelButton}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
