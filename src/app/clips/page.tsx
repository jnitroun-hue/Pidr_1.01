'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiHeaders } from '@/lib/api-headers';
import styles from './Clips.module.css';

type Aspect = '21:9' | '16:9' | '9:16' | '1:1';
type Resolution = '720p' | '1080p';

type Draft = {
  id: string;
  prompt: string;
  aspect: Aspect;
  seconds: number;
  resolution?: Resolution;
  status?: string;
  createdAt: number;
};

const KEY = 'must-clips';

const ASPECTS: Aspect[] = ['9:16', '16:9', '1:1', '21:9'];

export default function ClipsPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [seconds, setSeconds] = useState(10);
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [watermark, setWatermark] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDrafts(JSON.parse(raw) as Draft[]);
    } catch {
      setDrafts([]);
    }
  }, []);

  async function watch(taskId: string) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const response = await fetch(`/api/clips/status?taskId=${encodeURIComponent(taskId)}`, { headers: getApiHeaders(), cache: 'no-store' });
      const data = await response.json();
      if (!data.success) {
        setNotice(data.error || 'Не удалось узнать статус');
        return;
      }
      if (data.status === 'succeeded') {
        setNotice(data.delivered ? 'Ролик готов и отправлен в Telegram.' : (data.error || 'Ролик готов, но Telegram его не принял.'));
        setDrafts((list) => list.map((item) => item.id === taskId ? { ...item, status: data.delivered ? 'в Telegram' : 'готов' } : item));
        return;
      }
      if (data.status === 'failed') {
        setNotice(data.error || 'Kling отклонил ролик');
        setDrafts((list) => list.map((item) => item.id === taskId ? { ...item, status: 'ошибка' } : item));
        return;
      }
      setNotice(data.status === 'processing' ? 'Kling считает ролик…' : 'Заявка в очереди Kling…');
    }
    setNotice('Kling ещё считает. Оставь страницу открытой и нажми статус позже.');
  }

  async function submit() {
    const text = prompt.trim();
    if (text.length < 8 || busy) return;
    setBusy(true);
    setNotice('Отправляю в Kling…');
    try {
      const response = await fetch('/api/clips/generate', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          prompt: text,
          duration: seconds,
          aspectRatio: aspect,
          resolution,
          watermark,
          imageUrl: imageUrl.trim(),
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Заявка не ушла');
      const next: Draft = {
        id: data.taskId,
        prompt: text,
        aspect,
        seconds,
        resolution,
        status: 'считается',
        createdAt: Date.now(),
      };
      const list = [next, ...drafts].slice(0, 24);
      setDrafts(list);
      localStorage.setItem(KEY, JSON.stringify(list));
      setPrompt('');
      await watch(data.taskId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Заявка не ушла');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.stage}>
      <header className={styles.bar}>
        <button type="button" className={styles.back} onClick={() => router.push('/profile')}>←</button>
        <div className={styles.head}>
          <span>The Must</span>
          <h1>Клипы</h1>
        </div>
      </header>
      <div className={styles.layout}>
        <section className={styles.card}>
          <h2>Новый ролик</h2>
          <p className={styles.note}>
            Текст, кадр, длина 3–30 секунд, 720p или 1080p, водяной знак и ссылка на картинку. Это поля Kling 4.0. Готовый ролик бот пришлёт в личные сообщения, если аккаунт открыт из Telegram и боту уже написан /start.
          </p>
          <label htmlFor="clip-prompt">Что в кадре</label>
          <textarea
            id="clip-prompt"
            value={prompt}
            placeholder="Золотой ус в бордовом зале. Камера медленно подъезжает, шторы расходятся, на барабане вспыхивает множитель."
            onChange={(event) => setPrompt(event.target.value)}
          />
          <label htmlFor="clip-image">Картинка-референс, https</label>
          <input id="clip-image" type="url" value={imageUrl} placeholder="https://..." onChange={(event) => setImageUrl(event.target.value)} />
          <label>Кадр</label>
          <div className={styles.choices}>
            {ASPECTS.map((item) => (
              <button key={item} type="button" className={aspect === item ? styles.on : ''} onClick={() => setAspect(item)}>{item}</button>
            ))}
          </div>
          <label htmlFor="clip-seconds">Длина, секунды</label>
          <input id="clip-seconds" type="number" min={3} max={30} value={seconds} onChange={(event) => setSeconds(Number(event.target.value))} />
          <label>Разрешение</label>
          <div className={styles.choices}>
            {(['720p', '1080p'] as Resolution[]).map((item) => (
              <button key={item} type="button" className={resolution === item ? styles.on : ''} onClick={() => setResolution(item)}>{item}</button>
            ))}
          </div>
          <label className={styles.check}>
            <input type="checkbox" checked={watermark} onChange={(event) => setWatermark(event.target.checked)} />
            Водяной знак Kling
          </label>
          {notice ? <p className={styles.status}>{notice}</p> : null}
          <button type="button" className={styles.go} disabled={busy} onClick={() => void submit()}>{busy ? 'Считается…' : 'Сгенерировать'}</button>
        </section>
        <section className={styles.card}>
          <h2>Заявки</h2>
          {drafts.length === 0 ? <p className={styles.empty}>Пока пусто. Первая заявка появится здесь.</p> : (
            <div className={styles.list}>
              {drafts.map((draft) => (
                <article key={draft.id} className={styles.item}>
                  <b>Kling 4.0 · {draft.aspect} · {draft.resolution || '1080p'} · {draft.seconds} сек · {draft.status || 'сохранено'}</b>
                  <p>{draft.prompt}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
