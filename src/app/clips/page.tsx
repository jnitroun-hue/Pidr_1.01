'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Clips.module.css';

type Model = 'kling-video-v4_0' | 'kling-video-v4_0_flash';
type Aspect = '16:9' | '9:16' | '1:1';
type Seconds = 5 | 10;

type Draft = {
  id: string;
  prompt: string;
  model: Model;
  aspect: Aspect;
  seconds: Seconds;
  createdAt: number;
};

const KEY = 'must-clips';

const MODELS: { id: Model; label: string }[] = [
  { id: 'kling-video-v4_0', label: 'Kling 4.0' },
  { id: 'kling-video-v4_0_flash', label: '4.0 Flash' },
];

export default function ClipsPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<Model>('kling-video-v4_0');
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [seconds, setSeconds] = useState<Seconds>(5);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDrafts(JSON.parse(raw) as Draft[]);
    } catch {
      setDrafts([]);
    }
  }, []);

  function save() {
    const text = prompt.trim();
    if (!text) return;
    const next: Draft = {
      id: crypto.randomUUID(),
      prompt: text,
      model,
      aspect,
      seconds,
      createdAt: Date.now(),
    };
    const list = [next, ...drafts].slice(0, 24);
    setDrafts(list);
    localStorage.setItem(KEY, JSON.stringify(list));
    setPrompt('');
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
            Опиши кадр, выбери формат и длину. Заявка остаётся здесь. Считать ролик будет Kling с кредитов твоего аккаунта: вход откроется один раз, когда Cursor попросит подтвердить kling.ai.
          </p>
          <label htmlFor="clip-prompt">Что в кадре</label>
          <textarea
            id="clip-prompt"
            value={prompt}
            placeholder="Золотой ус в бордовом зале. Камера медленно подъезжает, шторы расходятся, на барабане вспыхивает множитель."
            onChange={(event) => setPrompt(event.target.value)}
          />
          <label>Модель</label>
          <div className={styles.choices}>
            {MODELS.map((item) => (
              <button key={item.id} type="button" className={model === item.id ? styles.on : ''} onClick={() => setModel(item.id)}>{item.label}</button>
            ))}
          </div>
          <label>Кадр</label>
          <div className={styles.choices}>
            {(['9:16', '16:9', '1:1'] as Aspect[]).map((item) => (
              <button key={item} type="button" className={aspect === item ? styles.on : ''} onClick={() => setAspect(item)}>{item}</button>
            ))}
          </div>
          <label>Длина</label>
          <div className={styles.choices}>
            {([5, 10] as Seconds[]).map((item) => (
              <button key={item} type="button" className={seconds === item ? styles.on : ''} onClick={() => setSeconds(item)}>{item} сек</button>
            ))}
          </div>
          <button type="button" className={styles.go} onClick={save}>Сохранить заявку</button>
        </section>
        <section className={styles.card}>
          <h2>Заявки</h2>
          {drafts.length === 0 ? <p className={styles.empty}>Пока пусто. Первая заявка появится здесь.</p> : (
            <div className={styles.list}>
              {drafts.map((draft) => (
                <article key={draft.id} className={styles.item}>
                  <b>{draft.model === 'kling-video-v4_0' ? 'Kling 4.0' : '4.0 Flash'} · {draft.aspect} · {draft.seconds} сек</b>
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
