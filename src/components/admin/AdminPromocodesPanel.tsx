'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Power, RefreshCw, Search, Trash2, Wand2, X } from 'lucide-react';
import {
  PROMO_REWARD_TYPES,
  describePromoReward,
  normalizePromoCode,
  promoRewardLabel,
  type PromoRewardType,
} from '@/lib/promo/promo-rewards';

export interface AdminPromocode {
  id: number;
  code: string;
  description: string | null;
  reward_type: PromoRewardType | string;
  reward_value: number;
  max_uses: number | null;
  per_user_limit?: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

type PromoForm = {
  code: string;
  description: string;
  reward_type: PromoRewardType;
  reward_value: string;
  max_uses: string;
  per_user_limit: string;
  expires_at: string; // datetime-local
  is_active: boolean;
};

const EMPTY_FORM: PromoForm = {
  code: '',
  description: '',
  reward_type: 'coins',
  reward_value: '',
  max_uses: '',
  per_user_limit: '1',
  expires_at: '',
  is_active: true,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px',
  background: 'rgba(15, 23, 42, 0.6)',
  border: '2px solid rgba(100, 116, 139, 0.3)',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  display: 'block',
  color: '#cbd5e1',
  marginBottom: '6px',
  fontWeight: 600,
  fontSize: '13px',
};

const smallBtn = (color: string, border: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 10px',
  background: `${color}22`,
  border: `1px solid ${border}`,
  borderRadius: '8px',
  color,
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

function randomCode(len = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function promoState(p: AdminPromocode): { label: string; color: string } {
  const expired = p.expires_at ? new Date(p.expires_at).getTime() < Date.now() : false;
  const exhausted = p.max_uses != null && p.used_count >= p.max_uses;
  if (!p.is_active) return { label: 'Выключен', color: '#94a3b8' };
  if (expired) return { label: 'Истёк', color: '#f97316' };
  if (exhausted) return { label: 'Исчерпан', color: '#f59e0b' };
  return { label: 'Активен', color: '#10b981' };
}

interface Props {
  isTablet?: boolean;
}

export default function AdminPromocodesPanel({ isTablet = false }: Props) {
  const [items, setItems] = useState<AdminPromocode[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, redemptions: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; id?: number } | null>(null);
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(nextPage), limit: '20', status });
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/admin/promocodes?${params}`, { credentials: 'include', cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setItems(data.promocodes || []);
          setStats(data.stats || { total: 0, active: 0, redemptions: 0 });
          setPage(data.pagination?.page || 1);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки промокодов:', err);
      } finally {
        setLoading(false);
      }
    },
    [page, search, status]
  );

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, code: randomCode() });
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (p: AdminPromocode) => {
    setForm({
      code: p.code,
      description: p.description || '',
      reward_type: (PROMO_REWARD_TYPES.some((t) => t.id === p.reward_type) ? p.reward_type : 'coins') as PromoRewardType,
      reward_value: String(p.reward_value ?? ''),
      max_uses: p.max_uses != null ? String(p.max_uses) : '',
      per_user_limit: String(p.per_user_limit ?? 1),
      expires_at: toDatetimeLocal(p.expires_at),
      is_active: Boolean(p.is_active),
    });
    setFormError(null);
    setModal({ mode: 'edit', id: p.id });
  };

  const rewardMeta = useMemo(
    () => PROMO_REWARD_TYPES.find((t) => t.id === form.reward_type) ?? PROMO_REWARD_TYPES[0],
    [form.reward_type]
  );

  const save = async () => {
    if (!modal) return;
    const code = normalizePromoCode(form.code);
    if (!code) return setFormError('Код: 3–32 символа, только A–Z, 0–9, «-» и «_»');
    const value = Number(form.reward_value);
    if (!Number.isFinite(value) || value <= 0) return setFormError('Укажите положительное значение награды');

    const payload = {
      code,
      description: form.description.trim(),
      reward_type: form.reward_type,
      reward_value: Math.floor(value),
      max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
      per_user_limit: form.per_user_limit.trim() ? Number(form.per_user_limit) : 1,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };

    setSaving(true);
    setFormError(null);
    try {
      const res =
        modal.mode === 'create'
          ? await fetch('/api/admin/promocodes', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
          : await fetch('/api/admin/promocodes', {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ promocode_id: modal.id, updates: payload }),
            });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Не удалось сохранить промокод');
        return;
      }
      setModal(null);
      await load(modal.mode === 'create' ? 1 : page);
    } catch {
      setFormError('Сеть недоступна');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: AdminPromocode) => {
    setBusyId(p.id);
    try {
      const res = await fetch('/api/admin/promocodes', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promocode_id: p.id, updates: { is_active: !p.is_active } }),
      });
      const data = await res.json();
      if (data.success && data.promocode) {
        setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...data.promocode } : x)));
        setStats((s) => ({ ...s, active: s.active + (data.promocode.is_active ? 1 : -1) }));
      } else {
        alert('❌ ' + (data.error || 'Ошибка'));
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: AdminPromocode) => {
    if (!confirm(`Удалить промокод ${p.code}? Активаций: ${p.used_count}. История активаций тоже удалится.`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/promocodes?id=${p.id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((x) => x.id !== p.id));
        setStats((s) => ({
          total: s.total - 1,
          active: s.active - (p.is_active ? 1 : 0),
          redemptions: s.redemptions - (p.used_count || 0),
        }));
      } else {
        alert('❌ ' + (data.error || 'Ошибка'));
      }
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard недоступен */
    }
  };

  const gridCols = '150px minmax(160px, 2fr) 140px 120px 110px 150px 110px auto';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isTablet ? 'stretch' : 'center',
          flexDirection: isTablet ? 'column' : 'row',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: 700, margin: 0 }}>Промокоды</h2>
        <motion.button
          onClick={openCreate}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '12px 22px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <Plus size={18} /> Создать промокод
        </motion.button>
      </div>

      {/* Сводка */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr 1fr' : 'repeat(3, 200px)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Всего кодов', value: stats.total, color: '#e2e8f0' },
          { label: 'Активных', value: stats.active, color: '#10b981' },
          { label: 'Активаций', value: stats.redemptions, color: '#fbbf24' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: '14px 16px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '14px',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: '24px', fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Фильтры */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && void load(1)}
            placeholder="Поиск по коду"
            style={{ ...inputStyle, paddingLeft: 36, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          style={{ ...inputStyle, width: 'auto', minWidth: 150 }}
        >
          <option value="all">Все</option>
          <option value="active">Только активные</option>
          <option value="inactive">Выключенные</option>
        </select>
        <button type="button" onClick={() => void load(1)} style={{ ...smallBtn('#cbd5e1', 'rgba(148,163,184,0.3)'), padding: '0 14px' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} /> Обновить
        </button>
      </div>

      {/* Таблица */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '2px solid rgba(100, 116, 139, 0.3)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: '1100px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                gap: '12px',
                padding: '14px 16px',
                background: 'rgba(251, 191, 36, 0.1)',
                borderBottom: '2px solid rgba(100, 116, 139, 0.3)',
                fontWeight: 700,
                fontSize: '13px',
                color: '#94a3b8',
              }}
            >
              <div>Код</div>
              <div>Описание</div>
              <div>Награда</div>
              <div>Активаций</div>
              <div>На игрока</div>
              <div>Действует до</div>
              <div>Статус</div>
              <div>Действия</div>
            </div>

            {items.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                {loading ? 'Загрузка…' : 'Промокодов пока нет — создайте первый.'}
              </div>
            )}

            {items.map((p) => {
              const st = promoState(p);
              const busy = busyId === p.id;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    gap: '12px',
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(100, 116, 139, 0.12)',
                    alignItems: 'center',
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '15px', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em' }}>
                      {p.code}
                    </span>
                    <button
                      type="button"
                      title="Скопировать"
                      onClick={() => void copy(p.code)}
                      style={{ background: 'none', border: 'none', color: copied === p.code ? '#10b981' : '#64748b', cursor: 'pointer', padding: 2 }}
                    >
                      {copied === p.code ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description || '—'}
                  </div>
                  <div>
                    <div style={{ color: '#10b981', fontWeight: 700, fontSize: '13px' }}>
                      {describePromoReward(p.reward_type, p.reward_value)}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>{promoRewardLabel(p.reward_type)}</div>
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: '13px' }}>
                    {p.used_count} / {p.max_uses ?? '∞'}
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: '13px' }}>{p.per_user_limit ?? 1}</div>
                  <div style={{ color: '#cbd5e1', fontSize: '12px' }}>
                    {p.expires_at ? new Date(p.expires_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : 'бессрочно'}
                  </div>
                  <div style={{ color: st.color, fontWeight: 700, fontSize: '12px' }}>{st.label}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" disabled={busy} onClick={() => openEdit(p)} style={smallBtn('#818cf8', 'rgba(99,102,241,0.35)')}>
                      <Pencil size={13} /> Изменить
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleActive(p)}
                      style={smallBtn(p.is_active ? '#f59e0b' : '#10b981', p.is_active ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.35)')}
                    >
                      <Power size={13} /> {p.is_active ? 'Выкл' : 'Вкл'}
                    </button>
                    <button type="button" disabled={busy} onClick={() => void remove(p)} style={smallBtn('#ef4444', 'rgba(239,68,68,0.35)')}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button type="button" disabled={page <= 1 || loading} onClick={() => void load(page - 1)} style={smallBtn('#cbd5e1', 'rgba(148,163,184,0.3)')}>
            <ChevronLeft size={14} /> Назад
          </button>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>
            {page} / {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => void load(page + 1)} style={smallBtn('#cbd5e1', 'rgba(148,163,184,0.3)')}>
            Вперёд <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Модалка создания / редактирования */}
      {modal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => !saving && setModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              borderRadius: '24px',
              border: '3px solid rgba(251, 191, 36, 0.55)',
              padding: '28px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#e2e8f0', margin: 0 }}>
                {modal.mode === 'create' ? 'Новый промокод' : `Изменить ${form.code}`}
              </h2>
              <button type="button" onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Код *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                  maxLength={32}
                  style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.08em', fontWeight: 800, color: '#fde68a' }}
                />
                <button
                  type="button"
                  title="Сгенерировать"
                  onClick={() => setForm({ ...form, code: randomCode() })}
                  style={{ ...smallBtn('#a78bfa', 'rgba(167,139,250,0.35)'), padding: '0 14px' }}
                >
                  <Wand2 size={15} />
                </button>
              </div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>A–Z, 0–9, «-», «_»; 3–32 символа. Регистр не важен.</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Описание (видит только админ)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={500}
                style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                placeholder="Например: розыгрыш в Telegram-канале, сентябрь"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Тип награды *</label>
                <select
                  value={form.reward_type}
                  onChange={(e) => setForm({ ...form, reward_type: e.target.value as PromoRewardType })}
                  style={inputStyle}
                >
                  {PROMO_REWARD_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{rewardMeta.hint}</div>
              </div>
              <div>
                <label style={labelStyle}>Значение * ({rewardMeta.unit})</label>
                <input
                  type="number"
                  min={1}
                  value={form.reward_value}
                  onChange={(e) => setForm({ ...form, reward_value: e.target.value })}
                  style={inputStyle}
                  placeholder={form.reward_type === 'premium_days' ? '7' : '500'}
                />
                {Number(form.reward_value) > 0 && (
                  <div style={{ color: '#10b981', fontSize: 11, marginTop: 4, fontWeight: 700 }}>
                    Игрок получит: {describePromoReward(form.reward_type, Number(form.reward_value))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Всего активаций</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Безлимит"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>На одного игрока</label>
                <input
                  type="number"
                  min={1}
                  value={form.per_user_limit}
                  onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, marginBottom: 20, alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Действует до</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontWeight: 600, fontSize: 13, paddingBottom: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
                Активен
              </label>
            </div>

            {formError && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(248, 113, 113, 0.35)',
                  color: '#fecaca',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <motion.button
                onClick={() => void save()}
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#1c1917',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Сохраняем…' : modal.mode === 'create' ? 'Создать' : 'Сохранить'}
              </motion.button>
              <motion.button
                onClick={() => setModal(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '14px 24px',
                  background: 'rgba(100, 116, 139, 0.2)',
                  border: '2px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '12px',
                  color: '#cbd5e1',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
