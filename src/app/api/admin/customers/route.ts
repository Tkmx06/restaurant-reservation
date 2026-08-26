import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ==========================================
// 顧客情報の更新（同じ guest_name の全予約に連絡先を反映、備考は直近の1件のみ）
// ==========================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { oldName, name, email, phone, company_name, notes, latestReservationId } = body;

    if (!oldName || !name) {
      return NextResponse.json({ error: '必須項目が入力されていません。' }, { status: 400 });
    }

    // 1. 氏名・連絡先・会社名は、この方の全ての予約行に反映する
    const { error: bulkError } = await supabase
      .from('reservations')
      .update({
        guest_name: name,
        email: email || null,
        phone: phone || null,
        company_name: company_name || null,
      })
      .eq('guest_name', oldName);

    if (bulkError) throw bulkError;

    // 2. 備考は直近の予約1件のみ更新する（他の予約行の _combined:[...] タグを壊さないため）
    if (latestReservationId) {
      const { data: target, error: fetchError } = await supabase
        .from('reservations')
        .select('notes')
        .eq('id', latestReservationId)
        .single();

      if (fetchError) throw fetchError;

      const combinedTags = (target?.notes || '').match(/_combined:\[.*?\]/g)?.join(' ') || '';
      const mergedNotes = [notes || '', combinedTags].filter(Boolean).join(' ').trim();

      const { error: notesError } = await supabase
        .from('reservations')
        .update({ notes: mergedNotes })
        .eq('id', latestReservationId);

      if (notesError) throw notesError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '顧客情報の更新に失敗しました。' }, { status: 500 });
  }
}

// ==========================================
// 顧客の削除（同じ guest_name の予約履歴を完全に削除する、取り消し不可）
// ==========================================
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: '氏名が指定されていません。' }, { status: 400 });
    }

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('guest_name', name);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '顧客の削除に失敗しました。' }, { status: 500 });
  }
}
